let fs = Promise.promisifyAll(require('fs'))
//let exec = Promise.promisify(require('child_process').exec)
let pem = Promise.promisifyAll(require('pem'))
let path = require('path')

let isPrivateKey = function(pem) {
	return pem.content.startsWith('-----BEGIN PRIVATE KEY-----') || pem.content.startsWith('-----BEGIN RSA PRIVATE KEY-----')
}

let isCertificate = function(pem) {
	return pem.content.startsWith('-----BEGIN CERTIFICATE-----')
}

module.exports = function*(filePath, fallback, options) {
	let securityPath = this.path(this.config.path.security)

	let files = yield fs.readdirAsync(securityPath)
	.filter(file => file[0] !== '.')
	.map(file => {
		return fs.readFileAsync(path.join(securityPath, file), 'ascii').then(content => {
			return {
				file,
				content
			}
		})
	})

	let keys = files.filter(isPrivateKey)
	let certificates = files.filter(isCertificate)

	this.security = {}

	if(keys.length === 0 || certificates.length === 0)
		return

	let key = keys.reduce((a, b) => a.content.length > b.content.length ? a : b)
	let cert = certificates[0]

	this.security.key = key.content
	this.security.cert = cert.content

	this.certificate = yield pem.readCertificateInfoAsync(cert.content)

	let expirationDate = new Date(this.certificate.validity.end)
	let expiresOn = expirationDate.toString()
	let now = new Date()
	let timeRemaining = expirationDate - now

	let expiresColor = null

	if(timeRemaining < 0)
		expiresColor = chalk.red
	else if(timeRemaining > 7 * 24 * 60 * 60 * 1000)
		expiresColor = chalk.green
	else
		expiresColor = chalk.yellow

	console.log('SSL certificate expires on:', expiresColor(expiresOn))
	this.separator()
}