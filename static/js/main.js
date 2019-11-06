let title;

$(document).ready(function () {
    // PLAY RANDOM MAJOR CHORDS
    getChords();


});

let getMelody = blob => {
    $.ajax({
        url: '/get_melody',
        dataType: 'json',
        type: 'post',
        data: {
            "title": title,
            "blob": blob
        },
        success: function(e) {
           console.log(e);
        },
        error: function(e) {
            console.log(e)
        },
    });
};

let getChords = () => {
    $.ajax({
        url: '/get_chords',
        dataType: 'json',
        type: 'get',
        data: {
            "major": true
        },
        success: function(e) {
            // reader to convert midi blob
            const reader = new FileReader();
            // volume settings
            const vol = new Tone.Volume(-22);
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
            title = e.title;
            let blob = "data:audio/midi;base64," + e.blob;
            // once opened the blob
            reader.onload = e => {
                // ---> onload midi file from line 49
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
                });
                // once trigger finished, play
                Tone.Transport.start();
            };
            // read midi file goto line 29 -->
            reader.readAsArrayBuffer(dataURItoBlob(blob));
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