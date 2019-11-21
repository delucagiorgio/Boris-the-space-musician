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
    CXPLAY: "CX_PLAY",
    CXRELISTENSONG: "CX_RELISTEN_SONG",
    CXADDMELODY: "CX_ADD_MELODY",
    CXNEWSONG: "CX_NEW_SONG",
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
        path:"/static/audio/boris/START.wav"}),
    CXLEARNTUTORIAL : Voice({
        name: EVNT.CXLEARNTUTORIAL,
        path:"/static/audio/boris/LEARN_TUTORIAL.wav"}),
    CXTUTORIALOK : Voice({
        name: EVNT.CXTUTORIALOK,
        path:"/static/audio/boris/TUTORIAL_OK.wav"}),
    CXTEMPO : Voice({
        name: EVNT.CXTEMPO,
        path:"/static/audio/boris/TEMPO.wav"}),
    CXFEELINGS : Voice({
        name: EVNT.CXFEELINGS,
        path:"/static/audio/boris/FEELINGS.wav"}),
    CXLIKECHORD : Voice({
        name: EVNT.CXLIKECHORD,
        path:"/static/audio/boris/LIKE_CHORD.wav"}),
    CXTRYSING : Voice({
        name: EVNT.CXTRYSING,
        path:"/static/audio/boris/TRY_SING.wav"}),
    CXLIKEMELODY : Voice({
        name: EVNT.CXLIKEMELODY,
        path:"/static/audio/boris/LIKE_MELODY.wav"}),
    CXRELISTENSONG : Voice({
        name: EVNT.CXRELISTENSONG,
        path:"/static/audio/boris/RELISTEN_SONG.wav"}),
    CXADDMELODY : Voice({
        name: EVNT.CXADDMELODY,
        path:"/static/audio/boris/ADD_MELODY.wav"}),
    CXNEWSONG : Voice({
        name: EVNT.CXNEWSONG,
        path:"/static/audio/boris/NEW_SONG.wav"}),
    CXRESTART : Voice({
        name: EVNT.CXRESTART,
        path:"/static/audio/boris/RESTART.wav"}),
    CXEND : Voice({
        name: EVNT.CXEND,
        path:"/static/audio/boris/END.wav"}),
};

const BEvents = () => {
    // audio
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioContext = new AudioContext();
    let audioInput = null;
    let realAudioInput = null;
    let inputPoint = null;
    let currentContext = EVNT.CXSTART;
    let lastContext = null;
    let audioRecorder = null;
    let bufferSize = 2048;
    let tempo = 120;
    let blobMelody = null;
    let stpMelody = false;
    let stpChords = false;
    let stpMajor  = true;
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
        tempo,
        stpMelody,
        stpChords,
        stpMajor,
        currentContext,
        lastContext,
        watchDogs,
        speechEvents,
        userStream,
        // listnWatchDogs(callback) {
        //     userStream.then(function (stream) {
        //         watchDogs = hark(stream, {
        //             interval : 50,
        //             threshold : -50
        //         });
        //         if (_DEBUG) console.log("[watchdogs] speech events armed");
        //         // event on speech
        //         watchDogs.on('speaking', function() {
        //             if (_DEBUG) console.log('[watchdogs] speaking');
        //         });
        //         // event on stop speech
        //         watchDogs.on('stopped_speaking', function() {
        //             if (_DEBUG) console.log('[watchdogs] stopped_speaking');
        //             return callback();
        //         });
        //     })
        // },
        listnHank(callback, ajax = true) {
            let self = this;
            userStream.then(function (stream) {
                speechEvents = hark(stream, {
                    interval : 90,
                    threshold : -50
                });
                if (_DEBUG) console.log("[hark] speech events armed");
                // start recording input audio
                self.startStream();
                // event on speech
                speechEvents.on('speaking', function() {
                    if (_DEBUG) console.log('[hark] speaking');
                });
                // event on stop speech
                speechEvents.on('stopped_speaking', function() {
                    if (_DEBUG) console.log('[hark] stopped_speaking');
                    // stop recording
                    speechEvents.stop();
                    self.stopStream(self.currentContext, ajax, callback);
                });

            })
        },
        startStream() {
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
        stopStream(inputContext, ajax = true, callback) {
            audioRecorder.stop();
            // export wav to blob
            audioRecorder.exportWAV(function (blob) {
                // export blob to base64
                convertBlobToBase64(blob).then(function(base64) {
                    // callback will receive nextcontext
                    if (ajax) {
                        if (_DEBUG) console.log("[dialogflow] request context:" + inputContext);
                        $.ajax({
                            url: '/get_response_step',
                            dataType: 'json',
                            type: 'post',
                            data: {
                                "input-context": inputContext,
                                "blob": base64
                            },
                            success: function(data) {
                                if (_DEBUG) console.log("[server] response success");
                                if (_DEBUG) console.log("[boris] next context > " + data.context);
                                // send to server the request with CONTEXT
                                callback(data.context.toUpperCase())
                            },
                            error: function(e) {
                                if (_DEBUG) {
                                    console.log("[server] error on response");
                                    console.log(e)
                                }
                            },
                        });
                    } else {
                        // callback will receive base64 of recordings
                        callback(base64);
                    }
                });
            });
        },
        call(input) {
            // if (watchDogs === null) {
            //     this.listnWatchDogs(function () {
            //         if (_DEBUG) console.log("[watchdogs] watchdogs never sleep")
            //     });
            // }
            switch (input) {
                case EVNT.CXSTART:
                    this.lastContext = this.currentContext;
                    this.currentContext = EVNT.CXSTART;
                    this.cxStart();
                    break;
                case EVNT.CXLEARNTUTORIAL:
                    this.lastContext = this.currentContext;
                    this.currentContext = EVNT.CXLEARNTUTORIAL;
                    this.cxLearnTutorial() ;
                    break;
                case EVNT.CXTUTORIALOK:
                    this.lastContext = this.currentContext;
                    this.currentContext = EVNT.CXTUTORIALOK;
                    this.cxTutorialOk();
                    break;
                case EVNT.CXTEMPO:
                    this.lastContext = this.currentContext;
                    this.currentContext = EVNT.CXTEMPO;
                    this.cxTempo();
                    break;
                case EVNT.CXFEELINGS:
                    this.lastContext = this.currentContext;
                    this.currentContext = EVNT.CXFEELINGS;
                    this.cxFeelings();
                    break;
                case EVNT.CXLIKECHORD:
                    this.lastContext = this.currentContext;
                    this.currentContext = EVNT.CXLIKECHORD;
                    this.cxLikeChord();
                    break;
                case EVNT.CXTRYSING:
                    this.lastContext = this.currentContext;
                    this.currentContext = EVNT.CXTRYSING;
                    this.cxTrySing();
                    break;
                case EVNT.CXLIKEMELODY:
                    this.lastContext = this.currentContext;
                    this.currentContext = EVNT.CXLIKEMELODY;
                    this.cxLikeMelody();
                    break;
                case EVNT.CXRELISTENSONG:
                    this.lastContext = this.currentContext;
                    this.currentContext = EVNT.CXRELISTENSONG;
                    this.cxRelistenSong();
                    break;
                case EVNT.CXADDMELODY:
                    this.lastContext = this.currentContext;
                    this.currentContext = EVNT.CXADDMELODY;
                    this.cxAddMelody();
                    break;
                case EVNT.CXPLAY:
                    this.lastContext = this.currentContext;
                    this.currentContext = EVNT.CXPLAY;
                    this.cxPlay();
                    break;
                case EVNT.CXNEWSONG:
                    this.lastContext = this.currentContext;
                    this.currentContext = EVNT.CXNEWSONG;
                    this.cxNewSong();
                    break;
                case EVNT.CXEND:
                    this.lastContext = this.currentContext;
                    this.currentContext = EVNT.CXEND;
                    this.cxEnd();
                    break;
                default:
                    this.call(this.currentContext);
                    break;
            }
        },
        cxStart(){
            let self = this;
            // log event  description
            if (_DEBUG) console.log("[boris] start");
            // get predefined chords
            getChords(stpMajor);
            // wait for "Boris!" activating command
            this.listnHank(function () {
                // Boris will say "Hello"
                VOICES.CXSTART.play(function () {
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
            VOICES.CXLEARNTUTORIAL.play(function () {
                // Boris will wait your answer
                self.listnHank(function (nextEvent) {
                    return self.call(nextEvent)
                }, true);
            })
        },
        cxTutorialOk(){
            let self = this;
            // log event  description
            if (_DEBUG) console.log("[boris] start tutorial feedback");
            // Boris will hask if you learnt the tutorial
            VOICES.CXTUTORIALOK.play(function () {
                // Boris will wait your answer
                self.listnHank(function (nextEvent) {
                    // the response will call the next event
                    return self.call(nextEvent)
                }, true);
            })
        },
        cxTempo(){
            let self = this;
            // log event  description
            if (_DEBUG) console.log("[boris] start tempo");
            // Boris will hask if you like this tempo
            VOICES.CXTEMPO.play(function () {
                // Boris will wait your answer
                self.listnHank(function (nextEvent) {
                    // the response will call the next event
                    return self.call(nextEvent)
                }, true);
            })
        },
        cxFeelings(){
            let self = this;
            // log event  description
            if (_DEBUG) console.log("[boris] start feelings");
            // if we are here melody is done
            stpMelody = true;
            // Boris will hask if you like this feelings
            VOICES.CXFEELINGS.play(function () {
                // Boris will wait your answer
                self.listnHank(function (nextEvent) {
                    // TODO: check how to manage stpMajor:fellings
                    // generate new chords respect the answer
                    getChords(stpMajor);
                    // the response will call the next event
                    return self.call(nextEvent)
                }, true);
            })
        },
        cxPlay(){
            let self = this;
            // log event  description
            if (_DEBUG) console.log("[boris] start playing music");
            getMelody(blobMelody)
            // commit temp part into final
            addMelody();
            // Boris will play your song
            playNote(true, true);
            // Once is finished
            Tone.Transport.once('stop', function () {
                if (_DEBUG) console.log("[music] song stopped");
                // Boris will ask if user want to relisten
                return self.call(EVNT.CXRELISTENSONG);
            })
        },
        cxLikeChord(){
            let self = this;
            // log event  description
            if (_DEBUG) console.log("[boris] start chord feedback");
            // Boris will hask if you like this chords
            VOICES.CXLIKECHORD.play(function () {
                // Boris will play the chords
                playNote(false, true);
                // Once chords are played
                Tone.Transport.once('stop', function () {
                    if (_DEBUG) console.log("[music] song stopped");
                    // Boris will ask if your like these chords
                    self.listnHank(function (nextEvent) {
                        // the response will call the next event
                        return self.call(nextEvent)
                    }, true);
                })

            })
        },
        cxTrySing(){
            let self = this;
            // log event  description
            if (_DEBUG) console.log("[boris] start sing");
            // Boris will hask to sing
            VOICES.CXTRYSING.play(function () {
                // Boris will wait your answer
                self.listnHank(function (base64) {
                    // save blob sing
                    blobMelody = base64;
                    // generate the melody
                    getChroma(base64, function () {
                        // the response will call the next event
                        return self.call(EVNT.CXLIKEMELODY)
                    });
                }, false);
            })
        },
        cxLikeMelody(){
            let self = this;
            // log event  description
            if (_DEBUG) console.log("[boris] start melody feedback");
            VOICES.CXLIKEMELODY.play(function () {
                // Boris will play the melody
                playNote(true, false);
                // Once melody is finished
                Tone.Transport.once('stop', function () {
                    if (_DEBUG) console.log("[music] song stopped");
                    // Boris will ask if your like this melody
                    self.listnHank(function (nextEvent) {
                        // if chords are already done play song
                        if (stpChords) {
                            return self.call(EVNT.CXPLAY)
                        } else {
                            return self.call(nextEvent)
                        }
                    }, true);
                });
            });
        },
        cxRelistenSong(){
            let self = this;
            // log event  description
            if (_DEBUG) console.log("[boris] start relisten");
            VOICES.CXRELISTENSONG.play(function () {
                // Boris will ask if you want to listen again the song
                self.listnHank(function (nextEvent) {
                    // the response will call the next event
                    return self.call(nextEvent)
                }, true);
            })
        },
        cxAddMelody(){
            let self = this;
            // log event  description
            if (_DEBUG) console.log("[boris] start add melody");
            VOICES.CXADDMELODY.play(function () {
                // Boris will ask if you want to add a new melody
                self.listnHank(function (nextEvent) {
                    // the response will call the next event
                    return self.call(nextEvent)
                }, true);
            })
        },
        cxNewSong(){
            let self = this;
            // log event  description
            if (_DEBUG) console.log("[boris] start new song");
            VOICES.CXNEWSONG.play(function () {
                // Boris will ask if you want to create a new song
                self.listnHank(function (nextEvent) {
                    // the response will call the next event
                    return self.call(nextEvent)
                }, true);
            })
        },
        cxEnd(){
            let self = this;
            // log event  description
            if (_DEBUG) console.log("[boris] start end");
            VOICES.CXEND.play(function () {
                // Boris will go away
            })
        }
    }
};

let xx = BEvents();
xx.call(EVNT.CXTRYSING);