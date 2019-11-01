$(document).ready(function () {
    // PLAY RANDOM MAJOR CHORDS
    mp2 = new MidiPlayer("/get_chords?major=1", 'btn1', true, 2);
    mp2.play();

    /*    $.ajax({
            url: '/get_chords',
            dataType: 'json',
            type: 'get',
            success: function(e) {
                console.log(e)
                mp2 = new MidiPlayer(e.path, 'btn1', true, 2);
                mp2.play();
            },
            error: function(e) {
                console.log(e)
            },
        });*/
});