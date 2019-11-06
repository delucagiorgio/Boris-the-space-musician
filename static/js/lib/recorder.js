/*License (MIT)

Copyright Â© 2013 Matt Diamond

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated 
documentation files (the "Software"), to deal in the Software without restriction, including without limitation 
the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and 
to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of 
the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO 
THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF 
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
DEALINGS IN THE SOFTWARE.
*/

var recLength = 0,
  recBuffersL = [],
  recBuffersR = [],
  sampleRate;

(function(window){
  var Recorder = function(source, cfg){
    var config = cfg || {};
    var bufferLen = config.bufferLen || 4096;
    this.context = source.context;
    if(!this.context.createScriptProcessor){
       this.node = this.context.createJavaScriptNode(bufferLen, 2, 2);
    } else {
       this.node = this.context.createScriptProcessor(bufferLen, 2, 2);
    }
   
    init({
        sampleRate: this.context.sampleRate
      })
    var recording = false,
      currCallback;

    this.node.onaudioprocess = function(e){
      if (!recording) return;
      record([
          e.inputBuffer.getChannelData(0),
          e.inputBuffer.getChannelData(1)
        ])
    }

    this.record = function(){
      recording = true;
    }

    this.stop = function(){
      recording = false;
    }

    this.clear = function(){
      clear();
    }

    this.getBuffers = function() {
      var res = getBuffers()
      return res
    }

    source.connect(this.node);
    this.node.connect(this.context.destination);   // if the script node is not connected to an output the "onaudioprocess" event is not triggered in chrome.
  };

  window.Recorder = Recorder;

  function init(config){
    sampleRate = config.sampleRate;
  }

  function record(inputBuffer){
    recBuffersL.push(inputBuffer[0]);
    recBuffersR.push(inputBuffer[1]);
    recLength += inputBuffer[0].length;
  }

  function clear(){
    recLength = 0;
    recBuffersL = [];
    recBuffersR = [];
  }

  function getBuffers() {
    var buffers = [];
    buffers.push( mergeBuffers(recBuffersL, recLength) );
    buffers.push( mergeBuffers(recBuffersR, recLength) );
    return buffers;
  }

  function mergeBuffers(recBuffers, recLength){
    var result = new Float32Array(recLength);
    var offset = 0;
    for (var i = 0; i < recBuffers.length; i++){
      result.set(recBuffers[i], offset);
      offset += recBuffers[i].length;
    }
    return result;
  }

})(window);
