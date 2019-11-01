import os
import random as rnd

from flask import Flask, redirect, render_template, request, url_for, jsonify
from engine import chords_core as chords
from engine.assets import music_assets as music

app = Flask(__name__)
app.config["DEBUG"] = True


@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "GET":
        return render_template("recorder.html")

    elif request.method == "POST":
        return render_template("recorder.html")

    return redirect(url_for('index'))

# RESTITUISCE UNA PROGRESSIONE DI ACCORDI IN FORMATO MIDI
@app.route("/get_chords", methods=["GET"])
def get_chords():
    if request.method == "GET":
        major = True if request.args.get("major") == 1 else False
        rnd_note = rnd.randint(0, len(music.notes) - 1)
        rnd_mode = rnd.randint(0, 2) if major else rnd.randint(3, len(music.modes) - 1)
        rnd_prog = rnd.randint(0, len(music.progressions) - 1)

        file_name = music.notes[rnd_note] + "_" + music.modes[rnd_mode].name + "_" + music.progressions[rnd_prog][1]
        path = "/out/" + file_name

        # SE NON ESISTE CREA IL FILE MIDI
        if not os.path.exists(path):
            m = chords.Fifth(music.notes[rnd_note], music.modes[rnd_mode].name)
            m.set_progression(music.progressions[rnd_prog][0])
            path = m.get_midi(file_name=file_name)

        with open(path, "rb") as f:
            return f.read()