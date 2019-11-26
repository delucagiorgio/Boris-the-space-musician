let chordsTitle;
let chordsMidi;
let chordsPart = new Tone.Part();
let chordsTone = SampleLibrary.load({
    minify: true,
    instruments: "piano"});

let melodyChroma = new Tone.Part();
let melodyPartNew = new Tone.Part();
let melodyPart = new Tone.Part();
let melodyTone = SampleLibrary.load({
    minify: true,
    instruments: "trumpet"});

getMelody =  (blob, onsuccess)  => {
    clearMelodyPartNew();
    $.ajax({
        url: '/get_melody',
        dataType: 'json',
        type: 'post',
        data: {
            "title": chordsTitle,
            "blob": blob
        },
        success: function(data) {
            readBlob(data, melodyTone).then(function(part) {
                melodyPartNew = part;
                onsuccess();
            });
        },
        error: function(e) {
            console.log(e)
        },
    });
};

getChroma = (blob, onsuccess) => {
    clearMelodyChroma();
    $.ajax({
        url: '/get_chroma',
        dataType: 'json',
        type: 'post',
        data: {
            "blob": blob
        },
        success: function(data) {
            readBlob(data, melodyTone).then(function(part) {
                melodyChroma = part;
                onsuccess();
            });
        },
        error: function(e) {
            console.log(e)
        },
    });
};

getChords = (major = true) => {
    clearChords();
    $.ajax({
        url: '/get_chords',
        dataType: 'json',
        type: 'get',
        data: {
            "major": major
        },
        success: function(data) {
            readBlob(data, chordsTone).then(function(part) {
                chordsPart = part;
                chordsTitle = data.title;
                chordsMidi =  data.blob;
            });
        },
        error: function(e) {
            console.log(e)
        },
    });
};

const dataURItoBlob = dataURI => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    let ab = new ArrayBuffer(byteString.length);
    let ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], {type: mimeString});
};

readPart = (data, synth) => {
    // reader to convert midi blob
    const temp = new FileReader();
    let part;

    return new Promise((resolve, reject) => {
        temp.onerror = () => {
            temp.abort();
            reject(new DOMException("Problem parsing input file."));
        };

        temp.onload = () => {
            // convert blob to tonejs format readable
            const midiChords = MidiConvert.parse(temp.result);
            // set clock params
            Tone.Transport.bpm.value = midiChords.bpm;
            Tone.Transport.timeSignature = midiChords.timeSignature;
            // trigger each note
            midiChords.tracks.forEach(track => {
                part = new Tone.Part((time, note) => {
                    synth.triggerAttackRelease(
                        note.name,
                        note.duration,
                        time,
                        note.velocity
                    );
                }, track.notes).start(midiChords.startTime);
            });
            resolve(part);
        };
        temp.readAsArrayBuffer(data);
    });
};

const readBlob = (data, synth) => {
    // reset synth clock
    //stopNote();
    // get response
    let blob = "data:audio/midi;base64," + data.blob;
    // trigger the note
    return readPart(dataURItoBlob(blob), synth)
};

playNote = (withMelody = true, withChords = true, withChroma = true) => {
    // set mute on melody
    melodyChroma.mute = !withChroma;
    melodyPart.mute = !withMelody;
    // set mute on chords
    chordsPart.mute = !withChords;
    // start playing
    Tone.Transport.start();
};

stopNote = () => {
    Tone.Transport.stop();
};

clearMelodyChroma = () => {
    melodyChroma = melodyChroma.removeAll();
};

clearMelodyPartNew = () => {
    melodyPartNew = melodyPartNew.removeAll();
};

clearChords = () => {
    chordsPart = chordsPart.removeAll();
};


addMelody = () => {
    let notes = [];
    let startNote = 0;
    let melodyNotesLength = melodyPart._events.length;

    if (melodyNotesLength > 0) {
        // we are append
        startNote = melodyPart.loopEnd;
        // init
        melodyPart._events.forEach(note => {
            notes.push(note.value)
        });
        // append
        melodyPartNew._events.forEach(note => {
            let newNote = note.value;
            newNote.time = newNote.time + startNote;
            notes.push(newNote)
        });
        // add
        melodyPart = new Tone.Part((time, note) => {
            melodyTone.triggerAttackRelease(
                note.name,
                note.duration,
                time,
                note.velocity
            );
        }, notes).start(0);
    } else {
        // init
        melodyPartNew._events.forEach(note => {
            notes.push(note.value)
        });
        // add
        melodyPart = new Tone.Part((time, note) => {
            melodyTone.triggerAttackRelease(
                note.name,
                note.duration,
                time,
                note.velocity
            );
        }, notes).start(0);
    }
    if (chordsPart.loopEnd !== 0 && chordsPart.loopEnd < melodyPart.loopEnd) {
        notes = [];
        // init
        startNote = chordsPart.loopEnd;
        chordsPart._events.forEach(note => {
            notes.push(note.value)
        });
        // append
        chordsPart._events.forEach(note => {
            let newNote = note.value;
            newNote.time = newNote.time + startNote;
            notes.push(newNote)
        });
        // add
        chordsPart = new Tone.Part((time, note) => {
            chordsTone.triggerAttackRelease(
                note.name,
                note.duration,
                time,
                note.velocity
            );
        }, notes).start(0);
    }
    clearMelodyPartNew();
};
