const _DEBUG = true;
const EVNT = {
    CXSTART: "CX_START",
    CXLEARNTUTORIAL: "CX_LEARN_TUTORIAL",
    CXTUTORIALOK: "CX_TUTORIAL_OK",
    CXTEMPO: "CX_TEMPO",
    CXFEELINGS: "CX_FEELINGS",
    CXLIKECHORD: "CX_LIKE_CHORD",
    CXTRYSING: "CX_TRY_SING",
    CXLIKEMELODY: "CX_LIKE_MELODY",
    CXRELISTENSONG: "CX_RELISTEN_SONG",
    CXADDMELODY: "CX_ADD_MELODY",
    CXNEWSONG: "CX_NEW_SONG",
    CXRESTART: "CX_RESTART",
    CXEND: "CX_END",
};

const convertBlobToBase64 = blob => new Promise((resolve, reject) => {
    const reader = new FileReader;
    reader.onerror = reject;
    reader.onload = () => {
        resolve(reader.result);
    };
    reader.readAsDataURL(blob);
});

const Voice = (state) => {
    let name = state.name;
    let path = state.path;
    let bufferSource = undefined;
    let buffer = new Promise((resolve, reject) => {
        try {
            if (_DEBUG) console.log( "[voice] loading " + name);
            // load player
            let buffer = new Tone.Buffer({
                url: path,
                reverse: false,
                onload: function () {
                    if (_DEBUG) console.log( "[voice] loaded " + name);
                    resolve(buffer)
                },
                onerror: function () {
                    reject(new DOMException("[voice] problem on input file"));
                }
            });
        } catch (e) {
            reject(new DOMException("[voice] problem on input file"));
        }
    });

    return {
        name,
        path,
        bufferSource,
        buffer,
        // play audio buffer
        play(callback = Tone.noOp) {
            buffer.then(function (buffer) {
                // convert Buffer to BufferSource and init
                bufferSource = new Tone.BufferSource({
                    buffer: buffer,
                    loop: false,
                    onload: function () {
                        if (_DEBUG) console.log("[voice] buffer " + name + " loaded");
                    }
                });

                // on end return callback
                bufferSource.onended = (self, e = callback) => {
                    // reinit buffersource https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode
                    // An AudioBufferSourceNode can only be played once; after each call to start(), you have to create a new node if you want to play the same sound again. Fortunately, these nodes are very inexpensive to create
                    bufferSource = new Tone.BufferSource({
                        buffer: buffer,
                        loop: false,
                        onload: function () {
                            if (_DEBUG) console.log("[voice] buffer " + name + " reloaded");
                        }
                    });
                    if (_DEBUG) console.log("[voice] playback " + name + " ended");
                    // callback
                    e();
                };
                // connect to master and start
                bufferSource.connect(Tone.Master);
                bufferSource.start();
                if (_DEBUG) console.log("[voice] playback " + name + " start");
            });
        },
    }
};

let VOICES = {
    CXSTART : Voice({
        name: EVNT.CXSTART,
        path:"/static/audio/boris/hello.wav"}),
    CXLEARNTUTORIAL : Voice({
        name: EVNT.CXLEARNTUTORIAL,
        path:"/static/audio/boris/piano.wav"}),
    CXTUTORIALOK : Voice({
        name: EVNT.CXTUTORIALOK,
        path:"/static/audio/boris/piano.wav"}),
    CXTEMPO : Voice({
        name: EVNT.CXTEMPO,
        path:"/static/audio/boris/piano.wav"}),
    CXFEELINGS : Voice({
        name: EVNT.CXFEELINGS,
        path:"/static/audio/boris/piano.wav"}),
    CXLIKECHORD : Voice({
        name: EVNT.CXLIKECHORD,
        path:"/static/audio/boris/piano.wav"}),
    CXTRYSING : Voice({
        name: EVNT.CXTRYSING,
        path:"/static/audio/boris/piano.wav"}),
    CXLIKEMELODY : Voice({
        name: EVNT.CXLIKEMELODY,
        path:"/static/audio/boris/piano.wav"}),
    CXRELISTENSONG : Voice({
        name: EVNT.CXRELISTENSONG,
        path:"/static/audio/boris/piano.wav"}),
    CXADDMELODY : Voice({
        name: EVNT.CXADDMELODY,
        path:"/static/audio/boris/piano.wav"}),
    CXNEWSONG : Voice({
        name: EVNT.CXNEWSONG,
        path:"/static/audio/boris/piano.wav"}),
    CXRESTART : Voice({
        name: EVNT.CXRESTART,
        path:"/static/audio/boris/piano.wav"}),
    CXEND : Voice({
        name: EVNT.CXEND,
        path:"/static/audio/boris/piano.wav"}),
};

const BEvents = () => {
    // client
    let commit = { melody: false, chord: false };
    let major = undefined;
    // audio
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioContext = new AudioContext();
    let audioInput = null;
    let realAudioInput = null;
    let inputPoint = null;
    let nowContext = EVNT.CXSTART;
    let audioRecorder = null;
    let bufferSize = 2048;
    let mono = true;
    let watchDogs = null;
    let speechEvents = null;
    let userStream = new Promise((resolve, reject) => {
        try {
            if (!navigator.getUserMedia)
                navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
            if (!navigator.cancelAnimationFrame)
                navigator.cancelAnimationFrame = navigator.webkitCancelAnimationFrame || navigator.mozCancelAnimationFrame;
            if (!navigator.requestAnimationFrame)
                navigator.requestAnimationFrame = navigator.webkitRequestAnimationFrame || navigator.mozRequestAnimationFrame;

            navigator.getUserMedia(
                {
                    "audio": {
                        "mandatory": {
                            "googEchoCancellation": "false",
                            "googAutoGainControl": "false",
                            "googNoiseSuppression": "false",
                            "googHighpassFilter": "false"
                        },
                        "optional": []
                    },
                }, function (stream) {
                    resolve(stream);
                }, function(e) {
                    reject(new DOMException("[audio] error getting audio"));
                });
            if (_DEBUG) console.log("[audio] context initialized");
        } catch (e) {
            reject(new DOMException("[audio] error getting audio"));
        }
    });

    return {
        audioInput,
        audioContext,
        audioRecorder,
        bufferSize,
        inputPoint,
        realAudioInput,
        mono,
        nowContext,
        watchDogs,
        speechEvents,
        userStream,
        setNowContext(input) {
            nowContext = input;
        },
        getMajor() {
            return major;
        },
        setMajor(input) {
            major = (input !== undefined)
        },
        getCommit() {
            return commit;
        },
        setCommitMelody(input) {
            commit.melody = (input !== undefined)
        },
        setCommitChord(input) {
            commit.chord = (input !== undefined)
        },
        goWatchDogs(callback) {
            userStream.then(function (stream) {
                watchDogs = hark(stream, {
                    interval : 50,
                    threshold : -50
                });
                if (_DEBUG) console.log("[watchdogs] speech events armed");
                // event on speech
                watchDogs.on('speaking', function() {
                    if (_DEBUG) console.log('[watchdogs] speaking');
                });
                // event on stop speech
                watchDogs.on('stopped_speaking', function() {
                    if (_DEBUG) console.log('[watchdogs] stopped_speaking');
                    return callback();
                });
            })
        },
        goHank(callback, ajax = true) {
            let self = this;
            userStream.then(function (stream) {
                speechEvents = hark(stream, {
                    interval : 50,
                    threshold : -50
                });
                if (_DEBUG) console.log("[hark] speech events armed");
                // event on speech
                speechEvents.on('speaking', function(there = self) {
                    if (_DEBUG) console.log('[hark] speaking');
                    there.gotStream()
                });
                // event on stop speech
                speechEvents.on('stopped_speaking', function(there = self) {
                    if (_DEBUG) console.log('[hark] stopped_speaking');
                    speechEvents.stop();
                    there.stopStream(there.nowContext, ajax);
                    return callback();
                });

            })
        },
        gotStream() {
            userStream.then(function (stream) {
                inputPoint = audioContext.createGain();
                // Create an AudioNode from the stream.
                realAudioInput = audioContext.createMediaStreamSource(stream);
                audioInput = realAudioInput;
                audioInput.connect(inputPoint);

                analyserNode = audioContext.createAnalyser();
                analyserNode.fftSize = bufferSize;
                inputPoint.connect(analyserNode);

                audioRecorder = new Recorder(inputPoint, {
                    bufferLen: bufferSize,
                    numChannels: 1,
                    mimeType: 'audio/wav'
                });

                audioRecorder.clear();
                audioRecorder.record();
            })
        },
        stopStream(inputContext, ajax = true) {
            audioRecorder.stop();
            // export wav to blob
            audioRecorder.exportWAV(function (blob) {
                // export blob to base64
                convertBlobToBase64(blob).then(function(base64) {
                    if (ajax) {
                        $.ajax({
                            url: '/get_response_step',
                            dataType: 'json',
                            type: 'post',
                            data: {
                                "input-context": inputContext,
                                "blob": base64
                            },
                            success: function(data) {
                                console.log(data)
                                /*                            readBlob(data, melodyTone).then(function(part) {
                                                                melodyPartTemp = part;
                                                            });*/
                            },
                            error: function(e) {
                                console.log(e)
                            },
                        });
                    }
                });
            });
        },
        call(input) {
            if (watchDogs === null) {
                this.goWatchDogs(function () {
                    console.log("[watchdogs] watchdogs never sleep")
                });
            }
            switch (input) {
                case EVNT.CXSTART:
                    this.nowContext = EVNT.CXSTART;
                    this.cxStart();
                    break;
                case EVNT.CXLEARNTUTORIAL:
                    this.nowContext = EVNT.CXLEARNTUTORIAL;
                    this.cxLearnTutorial() ;
                    break;
                case EVNT.CXTUTORIALOK:
                    this.nowContext = EVNT.CXTUTORIALOK;
                    this.cxTutorialOk();
                    break;
                case EVNT.CXTEMPO:
                    this.nowContext = EVNT.CXTEMPO;
                    this.cxTempo();
                    break;
                case EVNT.CXFEELINGS:
                    this.nowContext = EVNT.CXFEELINGS;
                    this.cxFeelings();
                    break;
                case EVNT.CXLIKECHORD:
                    this.nowContext = EVNT.CXLIKECHORD;
                    this.cxLikeChord();
                    break;
                case EVNT.CXTRYSING:
                    this.nowContext = EVNT.CXTRYSING;
                    this.cxTrySing();
                    break;
                case EVNT.CXLIKEMELODY:
                    this.nowContext = EVNT.CXLIKEMELODY;
                    this.cxLikeMelody();
                    break;
                case EVNT.CXRELISTENSONG:
                    this.nowContext = EVNT.CXRELISTENSONG;
                    this.cxRelistenSong();
                    break;
                case EVNT.CXADDMELODY:
                    this.nowContext = EVNT.CXADDMELODY;
                    this.cxAddMelody();
                    break;
                case EVNT.CXNEWSONG:
                    this.nowContext = EVNT.CXNEWSONG;
                    this.cxNewSong();
                    break;
                case EVNT.CXRESTART:
                    this.nowContext = EVNT.CXRESTART;
                    this.cxRestart();
                    break;
                case EVNT.CXEND:
                    this.nowContext = EVNT.CXEND;
                    this.cxEnd();
                    break;
                default:
                    this.call(EVNT.CXLEARNTUTORIAL);
                    break;
            }
        },
        cxStart(){
            let self = this;
            // log event  description
            if (_DEBUG) console.log("[boris] start");
            // wait for "Boris!" activating command
            this.goHank(function (there = self) {
                // play audio file
                VOICES.CXSTART.play(function (self = there) {
                    if (_DEBUG) console.log("[boris] next event to be launched");
                    self.call(EVNT.CXLEARNTUTORIAL)
                });
            }, false);
        },
        cxLearnTutorial() {
            let self = this;
            // log event  description
            if (_DEBUG) console.log("start learn tutorial");
            // Boris will hask if you want to learn the tutorial
            VOICES.CXLEARNTUTORIAL.play(function (there = self) {
                // Boris will wait your answer
                there.goHank(function (there = self) {
                    // send to server the request with CONTEXT
                    // the response will call the next event
                    // return self.call(response.context)

                });
            })
        },
        cxTutorialOk(){
            let self = this;
            // log event  description
            if (_DEBUG) console.log("[boris] start tutorial feedback");
            // Boris will hask if you learnt the tutorial
            VOICES.CXTUTORIALOK.play(function (there = self) {
                // Boris will wait your answer
                there.goHank(function (there = self) {
                    // send to server the request with CONTEXT
                    // the response will call the next event
                    // return self.call(response.context)
                });
            })
        },
        cxTempo(){
            if (_DEBUG) console.log("[boris] start tempo");
            // Boris will hask if you like this tempo
            VOICES.CXTEMPO.play(function (there = self) {
                // Boris will wait your answer
                there.goHank(function (there = self) {
                    // send to server the request with CONTEXT
                    // the response will call the next event
                    // return self.call(response.context)
                });
            })
        },
        cxFeelings(){
            if (_DEBUG) console.log("[boris] start feelings");
            // Boris will hask if you like this feelings
            VOICES.CXFEELINGS.play(function (there = self) {
                // Boris will wait your answer
                there.goHank(function (there = self) {
                    // send to server the request with CONTEXT
                    // the response will call the next event
                    // return self.call(response.context)
                });
            })
        },
        cxLikeChord(){
            if (_DEBUG) console.log("[boris] start chord feedback");
            // Boris will hask if you like this chords
            VOICES.CXLIKECHORD.play(function (there = self) {
                // Boris will wait your answer
                there.goHank(function (there = self) {
                    // send to server the request with CONTEXT
                    // the response will call the next event
                    // return self.call(response.context)
                });
            })
        },
        cxTrySing(){
            if (_DEBUG) console.log("[boris] start sing");
            // Boris will hask to sing
            VOICES.CXTRYSING.play(function (there = self) {
                // Boris will wait your answer
                there.goHank(function (there = self) {
                    // send to server the request with CONTEXT
                    // the response will call the next event
                    // return self.call(response.context)
                });
            })
        },
        cxLikeMelody(){
            if (_DEBUG) console.log("[boris] start melody feedback");
            VOICES.CXLIKEMELODY.play(function (there = self) {
                // Boris will ask if your like this melody
                there.goHank(function (there = self) {
                    // send to server the request with CONTEXT
                    // the response will call the next event
                    // return self.call(response.context)
                });
            })
        },
        cxRelistenSong(){
            if (_DEBUG) console.log("[boris] start relisten");
            VOICES.CXRELISTENSONG.play(function (there = self) {
                // Boris will ask if you want to listen again the song
                there.goHank(function (there = self) {
                    // send to server the request with CONTEXT
                    // the response will call the next event
                    // return self.call(response.context)
                });
            })
        },
        cxAddMelody(){
            if (_DEBUG) console.log("[boris] start add melody");
            VOICES.CXADDMELODY.play(function (there = self) {
                // Boris will ask if you want to add a new melody
                there.goHank(function (there = self) {
                    // send to server the request with CONTEXT
                    // the response will call the next event
                    // return self.call(response.context)
                });
            })
        },
        cxNewSong(){
            if (_DEBUG) console.log("[boris] start new song");
            VOICES.CXNEWSONG.play(function (there = self) {
                // Boris will ask if you want to create a new song
                there.goHank(function (there = self) {
                    // send to server the request with CONTEXT
                    // the response will call the next event
                    // return self.call(response.context)
                });
            })
        },
        cxRestart(){
            if (_DEBUG) console.log("[boris] start restart");
            // Boris will restart a new start from choosing tempo
            this.call(EVNT.CXTEMPO)
        },
        cxEnd(){
            if (_DEBUG) console.log("[boris] start end");
            VOICES.CXEND.play(function (there = self) {
                // Boris will go away
                there.goHank(function (there = self) {
                    // send to server the request with CONTEXT
                    // the response will call the next event
                    // return self.call(response.context)
                });
            })
        }
    }
};

let xx = BEvents();
xx.call(EVNT.CXSTART);