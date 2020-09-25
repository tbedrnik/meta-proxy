const http = require('http')
const axios = require('axios')
const cheerio = require('cheerio')

const urlRegexp = new RegExp(/^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/gm)

const fetchTags = async (url) => {

		if (!urlRegexp.test(url)) {
			throw new Error(`Invalid URL.`)
		}

		const response = await axios.get(url)

		const $ = cheerio.load(response.data)

		const $title = $('title')
		const $canonical = $('link[rel="canonical"]')
		const $description = $('meta[name="description"]')
		const $keywords = $('meta[name="keywords"]')
		const $opengraph = $('meta[property^="og:"]')
		const $twitter = $('meta[name^="twitter:"]')
		const $facebook = $('meta[property^="fb:"]')

		const meta = {
			title: $title.text(),
			canonical: $canonical.attr('href'),
			description: $description.attr('content'),
			keywords: $keywords.attr('content'),	
		}
		$opengraph.each((_, tag) => {
			tag = $(tag)
			meta[tag.attr('property')] = tag.attr('content')
		})
		$twitter.each((_, tag) => {
			tag = $(tag)
			meta[tag.attr('name')] = tag.attr('content')
		})
		$facebook.each((_, tag) => {
			tag = $(tag)
			meta[tag.attr('property')] = tag.attr('content')
		})

		return {
			html: [$title, $canonical, $description, $keywords, $opengraph, $twitter, $facebook].join(''),
			meta,
		}
}

const server = http.createServer((request, response) => {
	const { headers } = request
	const url = request.url.substring(1)
	response.setHeader('Content-Type', 'text/html')

	fetchTags(url).then(({html, meta}) => {
		response.statusCode = 200
		const data = {
			request: {
				url,
				headers,
			},
			data: {
				meta,
			}
		}
		response.end(`<html><head>${html}</head><body><pre>${JSON.stringify(data, null, 2)}</pre></body></html>`)
	}).catch((err) => {
		response.statusCode = 400
		const data = {
			request: {
				url,
				headers,
			},
			error: {
				message: err.message,
			}
		}
		response.end(`<html><body><pre>${JSON.stringify(data, null, 2)}</pre></body></html>`)
	})
})

const PORT = 3344

server.listen(PORT, () => {console.log(`Listening on port ${PORT}`)})

