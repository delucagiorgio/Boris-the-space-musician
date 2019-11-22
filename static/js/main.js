let chordsTitle;
let chordsMidi;
let chordsPart = new Tone.Part();
let chordsTone = SampleLibrary.load({
            minify: true,
            instruments: "piano"});

let melodyPartTemp = new Tone.Part();
let melodyPart = new Tone.Part();
let newMelodyPart = new Tone.Part();
let melodyTone = SampleLibrary.load({
            minify: true,
            instruments: "trumpet"});

$(document).ready(function () {
    // generate random chords
    // getChords(true);
    // connect synth to master out
    melodyTone.chain(new Tone.Volume(-20), Tone.Master);
    chordsTone.chain(new Tone.Volume(-22), Tone.Master);
});

getMelody =  blob  => {
    clearNewMelodyPart();
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
                newMelodyPart = part;
            });
        },
        error: function(e) {
            console.log(e)
        },
    });
};

getChroma = (blob, callback) => {

    $.ajax({
        url: '/get_chroma',
        dataType: 'json',
        type: 'post',
        data: {
            "blob": blob
        },
        success: function(data) {
            readBlob(data, melodyTone).then(function(part) {
                melodyPartTemp = part;
                callback();
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

playNote = (withMelody = true, withChords = true, withTempMelody = true) => {
    // set mute on melody
    melodyPartTemp.mute = !withTempMelody;
    melodyPart.mute = !withMelody;
    // set mute on chords
    chordsPart.mute = !withChords;
    // start playing
    Tone.Transport.start();
};

stopNote = () => {
    Tone.Transport.stop();
};

clearMelodyPartTemp = () => {
    melodyPartTemp = melodyPartTemp.removeAll();
};

clearNewMelodyPart = () => {
    newMelodyPart = newMelodyPart.removeAll();
};

clearChords = () => {
    chordsPart = chordsPart.removeAll();
};


addMelody = () => {
    let notes = [];
    let melodyNotesLength = newMelodyPart._events.length;

    if (melodyNotesLength > 0) {
        // we are append
        let startNote = melodyPart.loopEnd;

        melodyPart._events.forEach(note => {
            notes.push(note.value)
        });
        newMelodyPart._events.forEach(note => {
            let newNote = note.value;
            newNote.time = newNote.time + startNote;
            notes.push(newNote)
        });

        melodyPart = new Tone.Part((time, note) => {
            melodyTone.triggerAttackRelease(
                note.name,
                note.duration,
                time,
                note.velocity
            );
        }, notes).start(0);
    } else {
        // we are init
        newMelodyPart._events.forEach(note => {
            notes.push(note.value)
        });

        melodyPart = new Tone.Part((time, note) => {
            melodyTone.triggerAttackRelease(
                note.name,
                note.duration,
                time,
                note.velocity
            );
        }, notes).start(0);
    }
    newMelodyPart.removeAll();
};