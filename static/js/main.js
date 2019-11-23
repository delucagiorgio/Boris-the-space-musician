$(document).ready(function () {
    // connect synth to master out
    melodyTone.chain(new Tone.Volume(-20), Tone.Master);
    chordsTone.chain(new Tone.Volume(-22), Tone.Master);
    // start events
    let xx = BEvents();
    xx.call(EVNT.CXTRYSING);
});