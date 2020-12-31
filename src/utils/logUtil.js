const ext = {
  buffer: [],
  info: function() {
    const msg = [...arguments].join('')
    console.info(msg)
    ext.buffer.push(msg)
  },
  error: function() {
    const msg = [...arguments].join('')
    console.error(msg)
    ext.buffer.push(msg)
  },
  getLog: function() {
    const ret = ext.buffer
    ext.buffer = []
    return ret
  }
}
module.exports = ext
