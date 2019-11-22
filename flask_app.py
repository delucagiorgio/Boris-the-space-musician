import base64
import hashlib
import os
import json
import random as rnd
from os import path

from flask import Flask, redirect, render_template, request, url_for
from pretty_midi import PrettyMIDI

from engine import chords_core as chords
from engine.assets import music_assets as music
from engine.chroma_core import Chroma
from engine.melody_core import Melody
from engine.dialogflow_handler import BorisDialogFlow

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
        # decode audio file
        file_content = request.values.get("blob")
        # remove base64 header
        file_content = file_content[22:]
        # convert from base64 to bytecodes
        bytecodes = base64.b64decode(file_content)
        # create hash code
        hash_object = hashlib.sha256(bytecodes)
        hex_dig = hash_object.hexdigest()
        # generate temp file with hash to prevent conflict
        in_file = 'in/' + hex_dig + '.wav'
        out_file = 'in/' + hex_dig
        # create file
        with open(in_file, 'wb') as f:
            f.write(bytecodes)
            f.close()

            b = Chroma(path_audio=in_file, path_midi=out_file, tempo=120)
            b.run()

        os.remove(in_file)

        # wave_melody = io.StringIO(base64_melody)
        midi_chords = request.values.get("title")
        params = midi_chords.split("_")

        # Leggo i due file midi
        mel_midi = PrettyMIDI(out_file)
        m = Melody(
            music.notes[int(params[0])],
            music.modes[int(params[1])],
            mel_midi)

        m.create_melody(output_filename=out_file)

        with open(out_file, "rb") as f:
            results = json.dumps({
                "title": hex_dig,
                "blob": base64.b64encode(f.read()).decode('ascii')
            })

        os.remove(out_file)
        return results

@app.route("/get_chroma", methods=["POST"])
def get_chroma():
    if request.method == "POST":
        # decode audio file
        file_content = request.values.get("blob")
        # remove base64 header
        file_content = file_content[22:]
        # convert from base64 to bytecodes
        bytecodes = base64.b64decode(file_content)
        # create hash code
        hash_object = hashlib.sha256(bytecodes)
        hex_dig = hash_object.hexdigest()
        # generate temp file with hash to prevent conflict
        in_file = 'in/' + hex_dig + '.wav'
        out_file = 'in/' + hex_dig
        # create file
        with open(in_file, 'wb') as f:
            f.write(bytecodes)
            f.close()

            b = Chroma(path_audio=in_file, path_midi=out_file, tempo=120)
            b.run()

        os.remove(in_file)

        with open(out_file, "rb") as f:
            results = json.dumps({
                "title": hex_dig,
                "blob": base64.b64encode(f.read()).decode('ascii')
            })

        os.remove(out_file)
        return results


@app.route("/get_response_step", methods=["POST"])
def get_response_step():
    if request.method == "POST":
        # decode audio file
        file_content = request.values.get("blob")
        # get context of reference
        context = request.values.get("input-context")
        # remove base64 header
        file_content = file_content[22:]
        # convert from base64 to bytecodes
        bytecodes = base64.b64decode(file_content)
        # create hash code
        hash_object = hashlib.sha256(bytecodes)
        hex_dig = hash_object.hexdigest()
        # generate temp file with hash to prevent conflict
        in_file = 'in/' + hex_dig + '.wav'
        response = None
        # create file
        with open(in_file, 'wb') as f:
            f.write(bytecodes)
            f.close()

            b = BorisDialogFlow(audio_file=in_file)
            response = b.detect_intent_audio(context_short_name=context)

        if path.exists(in_file):
            os.remove(in_file)

        return json.dumps({
            "context": response,
        })