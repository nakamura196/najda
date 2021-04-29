const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())

//公文書館のデータをまとめたもの
const config = require('./config.json')

app.get('/na/iiif/:id', (_req, res) => {
  const url =
    _req.protocol + '://' + _req.get('host') + _req.originalUrl + '/info.json'
  res.writeHead(302, {
    Location: url,
  })
  res.end()
})

app.get('/na/iiif/:id/info.json', (_req, res) => {
  const id = _req.params.id
  
  //設定ファイルに含まれていない場合
  if (!config[id]) {
    return {}
  }

  const obj = config[id]

  const width = obj.width
  const height = obj.height
  const tile = obj.tile

  //サイズやタイルの部分は改善の余地あり
  const info = {
    '@context': 'http://iiif.io/api/image/2/context.json',
    '@id':
      _req.protocol +
      '://' +
      _req.get('host') +
      _req.originalUrl.replace('/info.json', ''),
    height,
    profile: [
      'http://iiif.io/api/image/2/level0.json',
      {
        formats: ['jpg'],
        qualities: ['default'],
      },
    ],
    protocol: 'http://iiif.io/api/image',
    sizes: [
      {
        height: 99,
        width: 125,
      },
      {
        height: 49,
        width: 63,
      },
      {
        height: 25,
        width: 31,
      },
      {
        height: 12,
        width: 16,
      },
      {
        height: 6,
        width: 8,
      },
      {
        height: 3,
        width: 4,
      },
      {
        height: 2,
        width: 2,
      },
      {
        height: 1,
        width: 1,
      },
    ],
    tiles: [
      {
        height: tile,
        scaleFactors: [1, 2, 4, 8, 16, 32, 164, 128],
        width: tile,
      },
    ],
    width,
  }

  return res.json(info)
})

app.get('/na/iiif/:id/:region/:size/:rotaion/default.jpg', (_req, res) => {
  const params = _req.params
  const id = params.id
  const region = params.region
  const size = params.size

  //設定ファイルに含まれていない場合
  if (!config[id]) {
    return res.json({})
  }

  const obj = config[id]

  const imageWidth = obj.width
  const imageHeight = obj.height
  const tile = obj.tile

  const longDimension = Math.max(imageWidth, imageHeight)
  const maxLevel = parseInt(Math.ceil(Math.log2(longDimension)))

  const prefix = obj.dzi.replace('.json', '')

  let url = ''

  if (region === 'full' && size === 'full') {
    url = 'https://www.digital.archives.go.jp/das/image-l/' + id
  } else if (region === 'full') {
    const t = Math.ceil(Math.log2(longDimension / tile))
    url = prefix + '_files/' + t + '/0_0.jpg'
  } else {
    const xywh = region.split(',')
    const x = Number(xywh[0])
    const y = Number(xywh[1])
    const w = Number(xywh[2])
    const h = Number(xywh[3])

    let window = -1

    if (x !== 0 && y !== 0) {
      const maxWidth = Math.max(w, h)
      const t = parseInt(Math.log2(maxWidth / tile))
      window = tile * 2 ** t
    } else if (x === 0) {
      window = w
    } else if (y === 0) {
      window = h
    } else {
      window = w
    }

    const level = maxLevel - parseInt(Math.log2(window / tile))

    const x0 = Math.ceil(x / window)
    const y0 = Math.ceil(y / window)

    url = prefix + '_files/' + level + '/' + x0 + '_' + y0 + '.jpg'
  }

  res.writeHead(302, {
    Location: url,
  })
  res.end()
})

const port = '3001'
app.listen(port, () => {
  // eslint-disable-next-line
  console.log(`app start listening on port ${port}`)
})

module.exports.handler = serverless(app)
