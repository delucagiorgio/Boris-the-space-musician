(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{let g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Recorder = f()}})(function(){let define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){let a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);let f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}let l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){let n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}let i=typeof require=="function"&&require;for(let o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
    "use strict";

    module.exports = require("./recorder").Recorder;

  },{"./recorder":2}],2:[function(require,module,exports){
    'use strict';

    let _createClass = (function () {
      function defineProperties(target, props) {
        for (let i = 0; i < props.length; i++) {
          let descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
        }
      }return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
      };
    })();

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.Recorder = undefined;

    let _inlineWorker = require('inline-worker');

    let _inlineWorker2 = _interopRequireDefault(_inlineWorker);

    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }

    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }

    exports.default = (exports.Recorder = (function () {
      function Recorder(source, cfg) {
        let _this = this;

        _classCallCheck(this, Recorder);

        this.config = {
          bufferLen: 4096,
          numChannels: 2,
          mimeType: 'audio/wav'
        };
        this.recording = false;
        this.callbacks = {
          getBuffer: [],
          exportWAV: []
        };

        Object.assign(this.config, cfg);
        this.context = source.context;
        this.node = (this.context.createScriptProcessor || this.context.createJavaScriptNode).call(this.context, this.config.bufferLen, this.config.numChannels, this.config.numChannels);

        this.node.onaudioprocess = function (e) {
          if (!_this.recording) return;

          let buffer = [];
          for (let channel = 0; channel < _this.config.numChannels; channel++) {
            buffer.push(e.inputBuffer.getChannelData(channel));
          }
          _this.worker.postMessage({
            command: 'record',
            buffer: buffer
          });
        };

        source.connect(this.node);
        this.node.connect(this.context.destination); //this should not be necessary

        let self = {};
        this.worker = new _inlineWorker2.default(function () {
          let recLength = 0,
              recBuffers = [],
              sampleRate = undefined,
              numChannels = undefined;

          self.onmessage = function (e) {
            switch (e.data.command) {
              case 'init':
                init(e.data.config);
                break;
              case 'record':
                record(e.data.buffer);
                break;
              case 'exportWAV':
                exportWAV(e.data.type);
                break;
              case 'getBuffer':
                getBuffer();
                break;
              case 'clear':
                clear();
                break;
            }
          };

          function init(config) {
            sampleRate = config.sampleRate;
            numChannels = config.numChannels;
            initBuffers();
          }

          function record(inputBuffer) {
            for (let channel = 0; channel < numChannels; channel++) {
              recBuffers[channel].push(inputBuffer[channel]);
            }
            recLength += inputBuffer[0].length;
          }

          function exportWAV(type) {
            let buffers = [];
            for (let channel = 0; channel < numChannels; channel++) {
              buffers.push(mergeBuffers(recBuffers[channel], recLength));
            }
            let interleaved = undefined;
            if (numChannels === 2) {
              interleaved = interleave(buffers[0], buffers[1]);
            } else {
              interleaved = buffers[0];
            }
            let dataview = encodeWAV(interleaved);
            let audioBlob = new Blob([dataview], {type: type});

            self.postMessage({command: 'exportWAV', data: audioBlob});
          }

          function getBuffer() {
            let buffers = [];
            for (let channel = 0; channel < numChannels; channel++) {
              buffers.push(mergeBuffers(recBuffers[channel], recLength));
            }
            self.postMessage({command: 'getBuffer', data: buffers});
          }

          function clear() {
            recLength = 0;
            recBuffers = [];
            initBuffers();
          }

          function initBuffers() {
            for (let channel = 0; channel < numChannels; channel++) {
              recBuffers[channel] = [];
            }
          }

          function mergeBuffers(recBuffers, recLength) {
            let result = new Float32Array(recLength);
            let offset = 0;
            for (let i = 0; i < recBuffers.length; i++) {
              result.set(recBuffers[i], offset);
              offset += recBuffers[i].length;
            }
            return result;
          }

          function interleave(inputL, inputR) {
            let length = inputL.length + inputR.length;
            let result = new Float32Array(length);

            let index = 0,
                inputIndex = 0;

            while (index < length) {
              result[index++] = inputL[inputIndex];
              result[index++] = inputR[inputIndex];
              inputIndex++;
            }
            return result;
          }

          function floatTo16BitPCM(output, offset, input) {
            for (let i = 0; i < input.length; i++, offset += 2) {
              let s = Math.max(-1, Math.min(1, input[i]));
              output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            }
          }

          function writeString(view, offset, string) {
            for (let i = 0; i < string.length; i++) {
              view.setUint8(offset + i, string.charCodeAt(i));
            }
          }

          function encodeWAV(samples) {
            let buffer = new ArrayBuffer(44 + samples.length * 2);
            let view = new DataView(buffer);

            /* RIFF identifier */
            writeString(view, 0, 'RIFF');
            /* RIFF chunk length */
            view.setUint32(4, 36 + samples.length * 2, true);
            /* RIFF type */
            writeString(view, 8, 'WAVE');
            /* format chunk identifier */
            writeString(view, 12, 'fmt ');
            /* format chunk length */
            view.setUint32(16, 16, true);
            /* sample format (raw) */
            view.setUint16(20, 1, true);
            /* channel count */
            view.setUint16(22, numChannels, true);
            /* sample rate */
            view.setUint32(24, sampleRate, true);
            /* byte rate (sample rate * block align) */
            view.setUint32(28, sampleRate * 4, true);
            /* block align (channel count * bytes per sample) */
            view.setUint16(32, numChannels * 2, true);
            /* bits per sample */
            view.setUint16(34, 16, true);
            /* data chunk identifier */
            writeString(view, 36, 'data');
            /* data chunk length */
            view.setUint32(40, samples.length * 2, true);

            floatTo16BitPCM(view, 44, samples);

            return view;
          }
        }, self);

        this.worker.postMessage({
          command: 'init',
          config: {
            sampleRate: this.context.sampleRate,
            numChannels: this.config.numChannels
          }
        });

        this.worker.onmessage = function (e) {
          let cb = _this.callbacks[e.data.command].pop();
          if (typeof cb == 'function') {
            cb(e.data.data);
          }
        };
      }

      _createClass(Recorder, [{
        key: 'record',
        value: function record() {
          this.recording = true;
        }
      }, {
        key: 'stop',
        value: function stop() {
          this.recording = false;
        }
      }, {
        key: 'clear',
        value: function clear() {
          this.worker.postMessage({command: 'clear'});
        }
      }, {
        key: 'getBuffer',
        value: function getBuffer(cb) {
          cb = cb || this.config.callback;
          if (!cb) throw new Error('Callback not set');

          this.callbacks.getBuffer.push(cb);

          this.worker.postMessage({command: 'getBuffer'});
        }
      }, {
        key: 'exportWAV',
        value: function exportWAV(cb, mimeType) {
          mimeType = mimeType || this.config.mimeType;
          cb = cb || this.config.callback;
          if (!cb) throw new Error('Callback not set');

          this.callbacks.exportWAV.push(cb);

          this.worker.postMessage({
            command: 'exportWAV',
            type: mimeType
          });
        }
      }], [{
        key: 'forceDownload',
        value: function forceDownload(blob, filename) {
          let url = (window.URL || window.webkitURL).createObjectURL(blob);
          let link = window.document.createElement('a');
          link.href = url;
          link.download = filename || 'output.wav';
          let click = document.createEvent("Event");
          click.initEvent("click", true, true);
          link.dispatchEvent(click);
        }
      }]);

      return Recorder;
    })());

  },{"inline-worker":3}],3:[function(require,module,exports){
    "use strict";

    module.exports = require("./inline-worker");
  },{"./inline-worker":4}],4:[function(require,module,exports){
    (function (global){
      "use strict";

      let _createClass = (function () { function defineProperties(target, props) { for (let key in props) { let prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

      let _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

      let WORKER_ENABLED = !!(global === global.window && global.URL && global.Blob && global.Worker);

      module.exports = (function () {
        function InlineWorker(func, self) {
          let _this = this;

          _classCallCheck(this, InlineWorker);

          if (WORKER_ENABLED) {
            let functionBody = func.toString().trim().match(/^function\s*\w*\s*\([\w\s,]*\)\s*{([\w\W]*?)}$/)[1];
            let url = global.URL.createObjectURL(new global.Blob([functionBody], {type: "text/javascript"}));

            return new global.Worker(url);
          }

          this.self = self;
          this.self.postMessage = function (data) {
            setTimeout(function () {
              _this.onmessage({data: data});
            }, 0);
          };

          setTimeout(function () {
            func.call(self);
          }, 0);
        }

        _createClass(InlineWorker, {
          postMessage: {
            value: function postMessage(data) {
              let _this = this;

              setTimeout(function () {
                _this.self.onmessage({data: data});
              }, 0);
            }
          }
        });

        return InlineWorker;
      })();
    }).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
  },{}]},{},[1])(1)
});
