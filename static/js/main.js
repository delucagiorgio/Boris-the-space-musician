var stopTutorial = false;
let xx = undefined;
$(document).ready(function () {
    // connect synth to master out
    melodyTone.chain(new Tone.Volume(-20), Tone.Master);
    chordsTone.chain(new Tone.Volume(-20), Tone.Master);
    // start events
    xx = BEvents();
    xx.call(EVNT.CXSTART);
});

$(document).keypress(function(e){
    console.debug("key pressed")

    if(!stopTutorial) stopTutorial = !stopTutorial

    if(xx.currentContext === EVNT.CXLEARNTUTORIAL){
        if(playing !== null){
            playing.stop();

        }

        xx.call(EVNT.CXTEMPO);
    }
});