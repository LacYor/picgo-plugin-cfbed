const crypto = require('crypto')
const axios = require('axios')
const FormData = require('form-data')

const config = (ctx) => {
  const userConfig = ctx.getConfig('picBed.cloudflare-imgbed') || {}
  return [
    {
      alias: '站点URL',
      name: 'baseUrl',
      type: 'input',
      default: userConfig.baseUrl || '',
      message: 'Cloudflare ImgBed 站点地址（如 https://img.example.com）',
      required: true
    },
    {
      alias: '上传认证码',
      name: 'authCode',
      type: 'password',
      default: userConfig.authCode || '',
      message: '上传认证码（在管理后台生成，可选）'
    },
    {
      alias: 'API Token',
      name: 'apiToken',
      type: 'password',
      default: userConfig.apiToken || '',
      message: 'API Token（需包含 upload/delete/list 权限，用于上传和远程删除）'
    },
    {
      alias: '上传渠道',
      name: 'uploadChannel',
      type: 'list',
      default: userConfig.uploadChannel || 'telegram',
      message: '选择上传渠道',
      choices: ['telegram', 'cfr2', 's3', 'discord', 'huggingface', 'webdav']
    },
    {
      alias: '频道名称',
      name: 'channelName',
      type: 'input',
      default: userConfig.channelName || '',
      message: '命名频道名称（可选，用于多频道设置）'
    },
    {
      alias: '文件命名',
      name: 'uploadNameType',
      type: 'list',
      default: userConfig.uploadNameType || 'default',
      message: '选择文件命名方式',
      choices: [
        { name: '默认（前缀+原名）', value: 'default' },
        { name: '仅前缀', value: 'index' },
        { name: '仅原名', value: 'origin' },
        { name: '短链接', value: 'short' },
        { name: '自定义格式', value: 'custom' }
      ]
    },
    {
      alias: '返回格式',
      name: 'returnFormat',
      type: 'list',
      default: userConfig.returnFormat || 'full',
      message: '返回URL格式',
      choices: [
        { name: '完整URL', value: 'full' },
        { name: '相对路径', value: 'default' }
      ]
    },
    {
      alias: '上传目录',
      name: 'uploadFolder',
      type: 'input',
      default: userConfig.uploadFolder || '',
      message: '上传目录路径（可选，如 img/test）'
    },
    {
      alias: '自定义命名格式',
      name: 'customNameFormat',
      type: 'input',
      default: userConfig.customNameFormat || '',
      message: '自定义文件名格式，如 {Y}{m}{d}_{h}{i}{s}_{str-8}（需将「文件命名」设为自定义格式）'
    },
    {
      alias: '服务端压缩',
      name: 'serverCompress',
      type: 'confirm',
      default: userConfig.serverCompress !== undefined ? userConfig.serverCompress : true,
      message: '启用服务端压缩（仅Telegram图片）'
    },
    {
      alias: '自动重试',
      name: 'autoRetry',
      type: 'confirm',
      default: userConfig.autoRetry !== undefined ? userConfig.autoRetry : true,
      message: '失败时自动切换渠道重试'
    },
    {
      alias: '启用远程删除',
      name: 'enableDelete',
      type: 'confirm',
      default: userConfig.enableDelete !== undefined ? userConfig.enableDelete : true,
      message: '在PicList中删除图片时同步删除远程文件'
    }
  ]
}

function formatCustomName(format, originalName) {
  const now = new Date()
  const pad = (n, len = 2) => String(n).padStart(len, '0')

  const extMatch = originalName.match(/\.[^.]+$/)
  const ext = extMatch ? extMatch[0] : ''
  const baseName = originalName.replace(/\.[^.]+$/, '')

  const map = {
    '{Y}': String(now.getFullYear()),
    '{y}': String(now.getFullYear()).slice(-2),
    '{m}': pad(now.getMonth() + 1),
    '{d}': pad(now.getDate()),
    '{h}': pad(now.getHours()),
    '{i}': pad(now.getMinutes()),
    '{s}': pad(now.getSeconds()),
    '{ms}': pad(now.getMilliseconds(), 3),
    '{timestamp}': String(now.getTime()),
    '{filename}': baseName,
    '{uuid}': crypto.randomUUID().replace(/-/g, '')
  }

  let result = format
  for (const [key, value] of Object.entries(map)) {
    result = result.replaceAll(key, value)
  }

  result = result.replace(/\{md5(?:-(\d+))?\}/g, (_, len) => {
    const hash = crypto.createHash('md5').update(baseName).digest('hex')
    return len ? hash.slice(0, parseInt(len)) : hash
  })

  result = result.replace(/\{sha256(?:-(\d+))?\}/g, (_, len) => {
    const hash = crypto.createHash('sha256').update(baseName).digest('hex')
    return len ? hash.slice(0, parseInt(len)) : hash
  })

  result = result.replace(/\{str-(\d+)\}/g, (_, len) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let str = ''
    for (let i = 0; i < parseInt(len); i++) {
      str += chars[Math.floor(Math.random() * chars.length)]
    }
    return str
  })

  return result + ext
}

async function uploadSingle(ctx, item, cfg, baseUrl) {
  const form = new FormData()

  let fileBuffer
  if (item.buffer) {
    fileBuffer = item.buffer
  } else if (item.base64Image) {
    fileBuffer = Buffer.from(item.base64Image, 'base64')
  } else {
    throw new Error('No file data found in output item')
  }

  let fileName = item.fileName || 'image' + (item.extname || '.png')

  if (cfg.uploadNameType === 'custom' && cfg.customNameFormat) {
    fileName = formatCustomName(cfg.customNameFormat, fileName)
  }

  form.append('file', fileBuffer, { filename: fileName })

  const params = {}
  if (cfg.uploadChannel) params.uploadChannel = cfg.uploadChannel
  if (cfg.channelName) params.channelName = cfg.channelName
  if (cfg.uploadNameType && cfg.uploadNameType !== 'default' && cfg.uploadNameType !== 'custom') params.uploadNameType = cfg.uploadNameType
  if (cfg.returnFormat) params.returnFormat = cfg.returnFormat
  if (cfg.uploadFolder) params.uploadFolder = cfg.uploadFolder
  if (cfg.serverCompress !== undefined && !cfg.serverCompress) params.serverCompress = 'false'
  if (cfg.autoRetry !== undefined && !cfg.autoRetry) params.autoRetry = 'false'
  if (cfg.authCode && !cfg.apiToken) params.authCode = cfg.authCode

  const headers = { ...form.getHeaders() }
  if (cfg.apiToken) {
    headers['Authorization'] = 'Bearer ' + cfg.apiToken
  }

  const url = baseUrl + '/upload'
  const response = await axios.post(url, form, { headers, params })

  const data = response.data
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error('Upload response invalid: ' + JSON.stringify(data))
  }

  const src = data[0].src

  let fullUrl
  if (cfg.returnFormat === 'full') {
    fullUrl = src
  } else {
    fullUrl = baseUrl + src
  }

  return { src, url: fullUrl, imgUrl: fullUrl }
}

const handle = async (ctx) => {
  const cfg = ctx.getConfig('picBed.cloudflare-imgbed')

  if (!cfg || !cfg.baseUrl) {
    ctx.emit('notification', {
      title: 'Cloudflare ImgBed 配置错误',
      body: '请先在图床设置中配置 Cloudflare ImgBed 的站点地址'
    })
    throw new Error('Cloudflare ImgBed baseUrl not configured')
  }

  const baseUrl = cfg.baseUrl.replace(/\/+$/, '')
  const output = ctx.output

  for (let i = 0; i < output.length; i++) {
    const item = output[i]
    try {
      const result = await uploadSingle(ctx, item, cfg, baseUrl)
      output[i].imgUrl = result.imgUrl
      output[i].url = result.url
    } catch (err) {
      ctx.emit('notification', {
        title: '上传失败',
        body: (item.fileName || '文件') + ' 上传到 Cloudflare ImgBed 失败: ' + err.message
      })
      throw err
    }
  }

  return ctx
}

function extractDeletePath(imgUrl, baseUrl) {
  let path = imgUrl

  try {
    const u = new URL(imgUrl)
    path = u.pathname
  } catch {
    if (baseUrl && path.startsWith(baseUrl)) {
      path = path.substring(baseUrl.length)
    }
  }

  if (path.startsWith('/')) {
    path = path.substring(1)
  }

  if (path.startsWith('file/')) {
    path = path.substring(5)
  }

  return path
}

async function removeHandler(ctx, files, guiApi) {
  const cfg = ctx.getConfig('picBed.cloudflare-imgbed')

  if (!cfg || cfg.enableDelete === false) return

  if (!cfg.apiToken) return

  const baseUrl = cfg.baseUrl ? cfg.baseUrl.replace(/\/+$/, '') : ''

  let deleteCount = 0
  let failCount = 0

  for (const file of files) {
    if (file.type && file.type !== 'cloudflare-imgbed') continue

    const imgUrl = file.imgUrl || file.url
    if (!imgUrl) continue

    try {
      const filePath = extractDeletePath(imgUrl, baseUrl)
      if (!filePath) continue

      const encodedPath = filePath.split('/').map(encodeURIComponent).join('/')
      const deleteUrl = baseUrl + '/api/manage/delete/' + encodedPath

      await axios.get(deleteUrl, {
        headers: { Authorization: 'Bearer ' + cfg.apiToken }
      })
      deleteCount++
    } catch (err) {
      failCount++
    }
  }

  if (failCount > 0) {
    const notification = {
      title: 'Cloudflare ImgBed 远程删除',
      body: '成功删除 ' + deleteCount + ' 个，失败 ' + failCount + ' 个'
    }
    if (guiApi && guiApi.showNotification) {
      guiApi.showNotification(notification)
    } else {
      ctx.emit('notification', notification)
    }
  }
}

module.exports = (ctx) => {
  const register = () => {
    ctx.helper.uploader.register('cloudflare-imgbed', {
      handle,
      config,
      name: 'Cloudflare ImgBed'
    })

    ctx.on('remove', (files, guiApi) => {
      removeHandler(ctx, files, guiApi).catch((err) => {
        ctx.log && ctx.log.error('Cloudflare ImgBed delete error:', err)
      })
    })
  }

  return {
    register,
    uploader: 'cloudflare-imgbed'
  }
}
