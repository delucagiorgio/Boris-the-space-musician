let chordsTitle;
let chordsMidi;
let chordsSequence = undefined;
let chordsTone = new Tone.PolySynth({
    polyphony : 16,
    volume : 0 ,
    detune : 0 ,
    voice : Tone.Synth
});

let melodySequence = undefined;
let melodyTone = new Tone.PolySynth({
    polyphony : 16,
    volume : 0 ,
    detune : 0 ,
    voice : Tone.Synth
});

$(document).ready(function () {
    // PLAY RANDOM MAJOR CHORDS
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
            trigNote(data, melodyTone).then(function(sequence) {
                melodySequence = sequence;
                playNote(false);
            });
        },
        error: function(e) {
            console.log(e)
        },
    });
};

let getChords = (major = true) => {
    $.ajax({
        url: '/get_chords',
        dataType: 'json',
        type: 'get',
        data: {
            "major": major
        },
        success: function(data) {
            trigNote(data, chordsTone).then(function(sequence) {
                chordsSequence = sequence;
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

const readSequence = (data, synth) => {
    // reader to convert midi blob
    const temp = new FileReader();
    let sequence;

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
                sequence = new Tone.Part((time, event) => {
                    synth.triggerAttackRelease(
                        event.name,
                        event.duration,
                        time,
                        event.velocity
                    );
                }, track.notes).start(midiChords.startTime);
            });
            resolve(sequence);
        };
        temp.readAsArrayBuffer(data);
    });
};

trigNote = (data, synth) => {
    // reset synth clock
    stopNote();
    // get response
    let blob = "data:audio/midi;base64," + data.blob;
    // trigger the note
    return readSequence(dataURItoBlob(blob), synth)
};

playNote = (withMelody = true) => {
    // once trigger finished, play
    stopNote();
    if (melodySequence !== undefined) {
        if (!withMelody) {
            melodySequence.removeAll();
        }
    }
    Tone.Transport.start();
};

stopNote = () => {
    // once trigger finished, play
    Tone.Transport.clear();
    Tone.Transport.stop();
};