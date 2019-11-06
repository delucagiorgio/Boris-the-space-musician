import base64
import os
import io
import json
import random as rnd

from flask import Flask, redirect, render_template, request, url_for
from pretty_midi import PrettyMIDI

from engine import chords_core as chords
from engine.assets import music_assets as music
from engine.chroma_core import Chroma
from engine.melody_core import Melody

app = Flask(__name__)
app.config["DEBUG"] = True


@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "GET":
        return render_template("recorder.html")

    elif request.method == "POST":
        return render_template("recorder.html")

    return redirect(url_for('index'))

# return chords progression in midi format
@app.route("/get_chords", methods=["GET"])
def get_chords():
    if request.method == "GET":
        major = True if request.args.get("major") == 'true' else False
        rnd_note = rnd.randint(0, len(music.notes) - 1)
        rnd_mode = rnd.randint(0, 2) if major else rnd.randint(3, len(music.modes) - 1)
        rnd_prog = rnd.randint(0, len(music.progressions) - 1)

        file_name = str(rnd_note) + "_" + str(rnd_mode) + "_" + str(rnd_prog)
        path = "/out/" + file_name

        # SE NON ESISTE CREA IL FILE MIDI
        if not os.path.exists(path):
            m = chords.Fifth(music.notes[rnd_note], music.modes[rnd_mode].name)
            m.set_progression(music.progressions[rnd_prog][0])
            path = m.get_midi(file_name=file_name)

        with open(path, "rb") as f:
            return json.dumps({
                "title": file_name,
                "blob": base64.b64encode(f.read()).decode('ascii')
            })

#
@app.route("/get_melody", methods=["POST"])
def get_melody():
    if request.method == "POST":
        base64_melody = request.values.get("blob")
        # wave_melody = io.StringIO(base64_melody)
        midi_chords = request.values.get("title")
        val = midi_chords.split("_")

        # b = Chroma(path_audio=wave_melody, path_midi="out/voce", tempo=120)
        # b.run()

        # Leggo i due file midi
        mel_midi = PrettyMIDI("out/" + midi_chords  + ".mid")
        m = Melody(
            music.notes[int(val[0])],
            music.modes[int(val[1])],
            mel_midi)

        m.create_melody()


        return "Ok"