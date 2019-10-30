from engine.assets import music_assets as music
import librosa.core as core
import pretty_midi as midi
import random as rnd


class Fifth:
    def __init__(self, tonic=None, mode=None, tempo=120):

        self.tonic = music.notes.index("C") if tonic is None else music.notes.index(tonic)
        self.mode = [x for x in music.modes if x.tonic == "C"][0] if mode is None else\
            [x for x in music.modes if x.name == mode][0]
        self.tempo = tempo

        self.major = []
        self.minor = []
        self.diminished = []
        self.cycle = []
        self.fifths = []
        self.chords = []

        # MIDI PARAMS
        self.pretty = midi.PrettyMIDI(initial_tempo=int(tempo))
        self.piano = midi.instrument_name_to_program('Acoustic Grand Piano')
        self.inst = midi.Instrument(program=self.piano)

        self.circle()

    def circle(self, fifths=None):
        if fifths is None:
            fifths = [music.notes[self.tonic]]

        degree = 0

        if len(fifths) < 12:
            for idx, val in enumerate([x.seq for x in music.modes if x.name == music.ionian][0]):

                if val == 1:
                    degree += 1

                    if degree == 5:
                        fifths.append(music.notes[self.tonic])
                        return self.circle(fifths)

                self.tonic = (self.tonic + 1) % len(music.notes)
                if self.tonic > len(music.notes) - 1:
                    self.tonic = 0

        self.major.append(fifths[-1 + self.mode.offset])
        self.major.append(fifths[0 + self.mode.offset])
        self.major.append(fifths[1 + self.mode.offset])

        self.minor.append(fifths[2 + self.mode.offset])
        self.minor.append(fifths[3 + self.mode.offset])
        self.minor.append(fifths[4 + self.mode.offset])

        self.diminished.append(fifths[5 + self.mode.offset])

        self.fifths = fifths
        self.tonic = music.notes.index(fifths[0])

        # REORDER SCALE DEGREE
        # I DEGREE
        self.cycle.append(music.notes[self.tonic])
        # FROM II - VII DEGREE
        for i in range(1, 12):
            cur = (self.tonic + i) % len(music.notes)
            if len(self.cycle) <= 7:
                if music.notes[cur] in self.major or \
                   music.notes[cur] in self.minor or \
                   music.notes[cur] in self.diminished:

                    self.cycle.append(music.notes[cur])

    @staticmethod
    def get_chords(tonic, chord=None):
        tonic = music.notes.index(tonic)
        chord = music.major if chord is None else chord

        chords = [
            music.notes[(tonic + chord[0]) % 12],
            music.notes[(tonic + chord[1]) % 12],
            music.notes[(tonic + chord[2]) % 12]
        ]

        return chords

    def set_progression(self, progression=None):
        if progression is None:
            progression = [0, 1, 2, 3]

        for idx, val in enumerate(progression):
            val = val - 1
            if self.cycle[val] in self.major:
                self.chords.append(self.get_chords(self.cycle[val], music.major))
            elif self.cycle[val] in self.minor:
                self.chords.append(self.get_chords(self.cycle[val], music.minor))
            else:
                self.chords.append(self.get_chords(self.cycle[val], music.diminished))

        for idx, chord in enumerate(self.chords):
            self.midi_gen(idx, chord)

        return self.chords

    def midi_gen(self, n, notes):
        start = 0 + n * 2
        end = start + 2

        if isinstance(notes, list):
            for idx, note in enumerate(notes):
                note_to_midi = core.note_to_midi(note + "4")
                note_to_midi = midi.Note(velocity=127, pitch=note_to_midi, start=start, end=end)
                self.inst.notes.append(note_to_midi)

                if idx == 1:
                    note_to_midi = core.note_to_midi(note + "3")
                    note_to_midi = midi.Note(velocity=127, pitch=note_to_midi, start=start, end=end)
                    self.inst.notes.append(note_to_midi)
        elif isinstance(notes, str):
            notes = core.note_to_midi(notes + "4")
            notes = midi.Note(velocity=127, pitch=notes, start=start, end=end)
            self.inst.notes.append(notes)

    def get_midi(self, file_name="chord", path="out/"):
        self.pretty.instruments.append(self.inst)
        self.pretty.write(path + file_name + ".mid")
        return self.pretty


happy = True
rnd_note = rnd.randint(0, len(music.notes) - 1)
rnd_mode = rnd.randint(0, 2) if happy else rnd.randint(3, len(music.modes) - 1)
rnd_prog = rnd.randint(0, len(music.progressions) - 1)

b = Fifth(music.notes[rnd_note], music.modes[rnd_mode].name)
b.set_progression(music.progressions[rnd_prog][0])
b.get_midi(music.notes[rnd_note] + "_" + music.modes[rnd_mode].name + "_" + music.progressions[rnd_prog][1])
#b.get_midi()


