let chordsTitle;
let chordsMidi;
let chordsPart = new Tone.Part();
let chordsTone = new Tone.PolySynth({
    polyphony : 16,
    volume : 0 ,
    detune : 0 ,
    voice : Tone.Synth
});

let melodyPartTemp = new Tone.Part();
let melodyPart = new Tone.Part();
let melodyTone = new Tone.PolySynth({
    polyphony : 16,
    volume : 0 ,
    detune : 0 ,
    voice : Tone.Synth
});

$(document).ready(function () {
    // generate random chords
    getChords(true);
    // connect synth to master out
    melodyTone.chain(new Tone.Volume(-20), Tone.Master);
    chordsTone.chain(new Tone.Volume(-22), Tone.Master);
});

let getMelody = blob => {
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
                melodyPartTemp = part;
            });
        },
        error: function(e) {
            console.log(e)
        },
    });
};

let getChords = (major = true) => {
    clearMelody();
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

const readPart = (data, synth) => {
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

readBlob = (data, synth) => {
    // reset synth clock
    stopNote();
    // get response
    let blob = "data:audio/midi;base64," + data.blob;
    // trigger the note
    return readPart(dataURItoBlob(blob), synth)
};

playNote = (withMelody = true) => {
    // stop playing
    stopNote();
    // set mute on melody
    melodyPartTemp.mute = !withMelody;
    melodyPart.mute = !withMelody;
    // start playing
    Tone.Transport.start();
};

stopNote = () => {
    Tone.Transport.clear();
    Tone.Transport.stop();
};

clearMelody = () => {
    melodyPartTemp.removeAll();
    melodyPart.removeAll();
};

clearChords = () => {
    chordsPart.removeAll();
};


addMelody = () => {
    let notes = [];
    let melodyNotesLength = melodyPart._events.length;

    if (melodyNotesLength > 0) {
        // we are append
        let startNote = melodyPart.loopEnd;

        melodyPart._events.forEach(note => {
            notes.push(note.value)
        });
        melodyPartTemp._events.forEach(note => {
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
        melodyPartTemp._events.forEach(note => {
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
    melodyPartTemp.removeAll();
};
