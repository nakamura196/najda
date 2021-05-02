// index.js
const functions = require("firebase-functions");
// Expressの読み込み
const express = require("express");
const cors = require('cors')
const fs = require("fs");
const convert = require('xml-js');

const app = express();
app.use(cors())

const host = "https://nakamura196.github.io/dzi"

app.get('/', (_req, res) => {
  return res.json({"hello": "world"})
})

app.get('/iiif-img/:id', (_req, res) => {
  const url =
    _req.protocol + '://' + _req.get('host') + "/api" + _req.originalUrl + '/info.json'
  res.writeHead(302, {
    Location: url,
  })
  res.end()
})

app.get('/iiif-img/:id/info.json', (_req, res) => {
  const params = _req.params
  const id = params.id

  const data = fs.readFileSync('./data/'+id+'.dzi','utf8')
  const config = JSON.parse(convert.xml2json(data, options))

  const image = config.elements[0]
  const sizeInfo = image.elements[0].attributes

  const imageWidth = Number(sizeInfo.Width)
  const imageHeight = Number(sizeInfo.Height)
  const tile = Number(image.attributes.TileSize)

  //サイズやタイルの部分は改善の余地あり
  const info = {
    '@context': 'http://iiif.io/api/image/2/context.json',
    '@id':
      _req.protocol +
      '://' +
      _req.get('host') + "/api" + 
      _req.originalUrl.replace('/info.json', ''),
    height: imageHeight,
    profile: [
      'http://iiif.io/api/image/2/level0.json',
      {
        formats: ['jpg'],
        qualities: ['default'],
      },
    ],
    protocol: 'http://iiif.io/api/image',
    /*
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
    */
    tiles: [
      {
        height: tile,
        scaleFactors: [1, 2, 4, 8, 16, 32, 164, 128],
        width: tile,
      },
    ],
    width: imageWidth,
  }

  return res.json(info)
})

app.get('/iiif-img2/:id/:region/:size/:rotaion/default.jpg', (_req, res) => {
  const params = _req.params
  const id = params.id
  const region = params.region
  const size = params.size

  const data = fs.readFileSync('./data/'+id+'.dzi','utf8')
  const config = JSON.parse(convert.xml2json(data, { ignoreComment: true, alwaysChildren: true }))

  const image = config.elements[0]
  const sizeInfo = image.elements[0].attributes

  const imageWidth = Number(sizeInfo.Width)
  const imageHeight = Number(sizeInfo.Height)
  const tile = Number(image.attributes.TileSize)

  const longDimension = Math.max(imageWidth, imageHeight)
  const maxLevel = parseInt(Math.ceil(Math.log2(longDimension)))

  const prefix = host + "/" + id + "/" + id + "_files/" //obj.dzi.replace('.json', '')

  let url = ''

  if (region === 'full' && size === 'full') {
    url = prefix + "0/0_0.jpg"
  } else if (region === 'full') {
    const t = Math.ceil(Math.log2(longDimension / tile))
    url = prefix + t + '/0_0.jpg'
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

    url = prefix + level + '/' + x0 + '_' + y0 + '.jpg'
  }

  res.writeHead(302, {
    Location: url,
  })
  res.end()
})

/*
const port = '3001'
app.listen(port, () => {
  // eslint-disable-next-line
  console.log(`app start listening on port ${port}`)
})
*/

// 出力
const api = functions.https.onRequest(app);
module.exports = { api };