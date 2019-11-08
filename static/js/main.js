let chordsTitle;
let chordsMidi;

$(document).ready(function () {
    // PLAY RANDOM MAJOR CHORDS
});

var getMelody = blob => {
    $.ajax({
        url: '/get_melody',
        dataType: 'json',
        type: 'post',
        data: {
            "title": chordsTitle,
            "blob": blob
        },
        success: function(e) {
            trigNote(e, -10);
            playNote();
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
        success: function(e) {
            trigNote(e, -23);
            chordsTitle = e.title;
            chordsMidi =  e.blob;
            playNote();
        },
        error: function(e) {
            console.log(e)
        },
    });
};

dataURItoBlob = dataURI => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    let ab = new ArrayBuffer(byteString.length);
    let ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], {type: mimeString});
};

trigNote = (data, volume = -22) => {
    // reader to convert midi blob
    const reader = new FileReader();
    // volume settings
    const vol = new Tone.Volume(volume);
    // synth polyphonic 4 voices
    const synth = new Tone.PolySynth({
        polyphony : 4,
        volume : 0 ,
        detune : 0 ,
        voice : Tone.Synth
    });
    // connect synth to master out
    synth.chain(vol, Tone.Master);
    // reset synth clock
    Tone.Transport.clear();
    Tone.Transport.stop();
    // get response
    let blob = "data:audio/midi;base64," + data.blob;
    // once opened the blob
    reader.onload = e => {
        // convert blob to tonejs format readable
        const midiChords = MidiConvert.parse(e.target.result);
        // set clock params
        Tone.Transport.bpm.value = midiChords.bpm;
        Tone.Transport.timeSignature = midiChords.timeSignature;
        // trigger each note
        midiChords.tracks.forEach(track => {
            new Tone.Part((time, event) => {
                synth.triggerAttackRelease(
                    event.name,
                    event.duration,
                    time,
                    event.velocity
                );
            }, track.notes).start(midiChords.startTime);
/* TODO > Manage loop here
            note.set({
                "loop" : true,
                "loopEnd" : "4m"
            });
            //start the note at the beginning of the Transport timeline
            note.start(0);
            //stop the note on the 4th measure
            note.stop("9m");
            */
        });
    };
    // read midi file goto reader.onload
    reader.readAsArrayBuffer(dataURItoBlob(blob));
};

playNote = () => {
    // once trigger finished, play
    Tone.Transport.start();
};

stopNote = () => {
    // once trigger finished, play
    Tone.Transport.clear();
    Tone.Transport.stop();
};