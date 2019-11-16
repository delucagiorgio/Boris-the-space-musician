const EVNT = {
    CXSTART: "cxStart",
    CXLEARNTUTORIAL: "cxLearnTutorial",
    CXTUTORIALOK: "cxTutorialOk",
    CXTEMPO: "cxTempo",
    CXMENU: "cxMenu",
    CXFEELINGS: "cxFeelings",
    CXLIKECHORD: "cxLikeChord",
    CXTRYSING: "cxTrySing",
    CXLIKEMELODY: "cxLikeMelody",
    CXRELISTENSONG: "cxRelistenSong",
    CXADDMELODY: "cxAddMelody",
    CXNEWSONG: "cxNewSong",
    CXRESTART: "cxRestart",
    CXEND: "cxEnd",
};

let BPlayers = {
    CXSTART : { path: "/static/audio/boris/hello.wav", player: undefined},
    CXLEARNTUTORIAL : { path: "/static/audio/boris/piano.wav", player: undefined},
    CXTUTORIALOK : { path: "/static/audio/boris/piano.wav", player: undefined},
    CXTEMPO : { path: "/static/audio/boris/piano.wav", player: undefined},
    CXMENU : { path: "/static/audio/boris/piano.wav", player: undefined},
    CXFEELINGS : { path: "/static/audio/boris/piano.wav", player: undefined},
    CXLIKECHORD : { path: "/static/audio/boris/piano.wav", player: undefined},
    CXTRYSING : { path: "/static/audio/boris/piano.wav", player: undefined},
    CXLIKEMELODY : { path: "/static/audio/boris/piano.wav", player: undefined},
    CXRELISTENSONG : { path: "/static/audio/boris/piano.wav", player: undefined},
    CXADDMELODY : { path: "/static/audio/boris/piano.wav", player: undefined},
    CXNEWSONG : { path: "/static/audio/boris/piano.wav", player: undefined},
    CXRESTART : { path: "/static/audio/boris/piano.wav", player: undefined},
    CXEND : { path: "/static/audio/boris/piano.wav", player: undefined},
};

const BEvents = () => {
    const __DEBUG = true;

    let commit = { melody: false, chord: false };
    let major = undefined;

    let promiseLoader = (objName, path) => {
        let player = new Tone.Player();

        return new Promise((resolve, reject) => {
            try {
                // load player
                player = new Tone.Player({
                    "url" : path,
                    "autostart" : false,
                }).toMaster();

                // waits for sound file to be loaded from path
                Tone.Buffer.on('load', function() {
                    if (__DEBUG) console.log(objName + " player loaded from: " + path);
                    // unsync the source to the Transport
                    player.unsync();
                    if (__DEBUG) console.log(objName + " unsynced");
                    resolve(player);
                });
            } catch (e) {
                reject(new DOMException("Problem parsing input file."));
            }
        });
    };

    let loader = () => {
        if (__DEBUG) console.log("loading all audio files");
        // load each sample and save its promise
        $.each(BPlayers, function(i, val) {
            // each promise will be convert to player once invoked
            val.player = promiseLoader(i, val.path)
        });
    };

    loader();

    return {
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
        playVoice(eventName) {
            $.each(EVNT, function(i, val) {
                if (val === eventName){
                    BPlayers[i].player.then(function (player) {
                        BPlayers[i].player = player;
                        BPlayers[i].player.start();
                        if (__DEBUG) console.log("playing " + eventName);
                        return true;
                    });
                }
            });
            return false;
        },
        call(input) {
            switch (input) {
                case EVNT.CXSTART:
                    this.cxStart();
                    break;
                case EVNT.CXLEARNTUTORIAL:
                    this.cxLearnTutorial() ;
                    break;
                case EVNT.CXTUTORIALOK:
                    this.cxTutorialOk();
                    break;
                case EVNT.CXTEMPO:
                    this.cxTempo();
                    break;
                case EVNT.CXMENU:
                    this.cxMenu();
                    break;
                case EVNT.CXFEELINGS:
                    this.cxFeelings();
                    break;
                case EVNT.CXLIKECHORD:
                    this.cxLikeChord();
                    break;
                case EVNT.CXTRYSING:
                    this.cxTrySing();
                    break;
                case EVNT.CXLIKEMELODY:
                    this.cxLikeMelody();
                    break;
                case EVNT.CXRELISTENSONG:
                    this.cxRelistenSong();
                    break;
                case EVNT.CXADDMELODY:
                    this.cxAddMelody();
                    break;
                case EVNT.CXNEWSONG:
                    this.cxNewSong();
                    break;
                case EVNT.CXRESTART:
                    this.cxRestart();
                    break;
                case EVNT.CXEND:
                    this.cxEnd();
                    break;
                default:
                    this.call(EVNT.CXSTART);
                    break;
            }
        },
        cxStart(){
            if (__DEBUG) console.log("start boris");
            this.playVoice(EVNT.CXSTART);
        },
        cxLearnTutorial() {
            if (__DEBUG) console.log("start learn tutorial");
            this.playVoice(EVNT.CXLEARNTUTORIAL);
        },
        cxTutorialOk(){
            if (__DEBUG) console.log("start tutorial feedback");
            this.playVoice(EVNT.CXTUTORIALOK);
        },
        cxTempo(){
            if (__DEBUG) console.log("start tempo");
            this.playVoice(EVNT.CXTEMPO);
        },
        cxMenu(){
            if (__DEBUG) console.log("start menu");
            this.playVoice(EVNT.CXMENU);
        },
        cxFeelings(){
            if (__DEBUG) console.log("start feelings");
            this.playVoice(EVNT.CXFEELINGS);
        },
        cxLikeChord(){
            if (__DEBUG) console.log("start chord feedback");
            this.playVoice(EVNT.CXLIKECHORD);
        },
        cxTrySing(){
            if (__DEBUG) console.log("start sing");
            this.playVoice(EVNT.CXTRYSING);
        },
        cxLikeMelody(){
            if (__DEBUG) console.log("start melody feedback");
            this.playVoice(EVNT.CXLIKEMELODY);
        },
        cxRelistenSong(){
            if (__DEBUG) console.log("start relisten");
            this.playVoice(EVNT.CXRELISTENSONG);
        },
        cxAddMelody(){
            if (__DEBUG) console.log("start add melody");
            this.playVoice(EVNT.CXADDMELODY);
        },
        cxNewSong(){
            if (__DEBUG) console.log("start new song");
            this.playVoice(EVNT.CXNEWSONG);
        },
        cxRestart(){
            if (__DEBUG) console.log("start restart");
            this.playVoice(EVNT.CXRESTART);
        },
        cxEnd(){
            if (__DEBUG) console.log("start end");
            this.playVoice(EVNT.CXEND);
        }
    }
};

let xx = BEvents();
xx.call(EVNT.CXSTART);