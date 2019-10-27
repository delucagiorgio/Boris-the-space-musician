import pretty_midi as midi
import librosa.core as core
import random as rnd

class Mode:
    tonic = None
    offset = None
    name = None
    seq = None

    def __init__(self, tonic=None, offset=None, name=None, mode=None):
        self.tonic=tonic
        self.name=name
        self.seq=mode
        self.offset=offset

LYDIAN     = "Lydian"
IONIAN     = "Ionian"
MYXOLYDIAN = "Myxolydian"
DORIAN     = "Dorian"
AEOLIAN    = "Aeolian"
PHRYGIAN   = "Phrygian"
LOCRIAN    = "Locrian"

MAJOR      = [0, 4, 7]
MINOR      = [0, 3, 7]
DIMINISHED = [0, 3, 6]
AUGMENTED  = [0, 4, 8]

NOTE = ["C" , "C#" , "D" , "D#" , "E" , "F" , "F#" , "G" , "G#" , "A" , "A#" , "B"]

# ORDERED FROM MAJOR TO MINOR
MODES = [
    Mode("C",  0, IONIAN,      [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1]),
    Mode("F",  1, LYDIAN,      [1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1]),
    Mode("G", -1, MYXOLYDIAN,  [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0]),
    Mode("D", -2, DORIAN,      [1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0]),
    Mode("E", -4, PHRYGIAN,    [1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0]),
    Mode("A", -3, AEOLIAN,     [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0]),
    Mode("B", -5, LOCRIAN,     [1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0]),
]

HARMONY_PROGRESSION = (
    ([1,6,2,5], "I-VI-II-V"),
    ([1,4,5,5], "I–IV–V–V"),
    ([1,1,4,5], "I–I–IV–V"),
    ([1,4,5,1], "I–IV–V–I"),
    ([1,4,1,5], "I–IV–I–V"),
    ([1,4,5,4], "I–IV–V–IV"),
    ([1,2,3,4], "I-II-III-IV")
)

class Fifth:
    def __init__(self, tonic=None, mode=None, tempo=120):
        self.tonic  = NOTE.index("C") if tonic is None else NOTE.index(tonic)
        self.mode = [x for x in MODES if x.tonic == "C"][0] if mode is None else [x for x in MODES if x.name == mode][0]
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
            fifths = []
            fifths.append(NOTE[self.tonic])

        degree = 0

        if len(fifths) < 12:
            for idx, val in enumerate([x.seq for x in MODES if x.name == IONIAN][0]):

                if val == 1:
                    degree += 1

                    if degree == 5:
                        fifths.append(NOTE[self.tonic])
                        return self.circle(fifths)

                self.tonic = (self.tonic + 1) % len(NOTE)
                if self.tonic > len(NOTE) - 1:
                    self.tonic = 0

        self.major.append(fifths[-1 + self.mode.offset])
        self.major.append(fifths[0 + self.mode.offset])
        self.major.append(fifths[1 + self.mode.offset])

        self.minor.append(fifths[2 + self.mode.offset])
        self.minor.append(fifths[3 + self.mode.offset])
        self.minor.append(fifths[4 + self.mode.offset])

        self.diminished.append(fifths[5 + self.mode.offset])

        self.fifths = fifths
        self.tonic = NOTE.index(fifths[0])

        # REORDER SCALE DEGREE
        self.cycle.append(NOTE[self.tonic]) # I DEGREE
        for i in range(1,12): # FROM II - VII DEGREE
            cur = (self.tonic + i) % len(NOTE)
            if len(self.cycle) <= 7:
                if  NOTE[cur] in self.major or NOTE[cur] in self.minor or NOTE[cur] in self.diminished:
                    self.cycle.append(NOTE[cur])


    def get_chords(self, tonic, chord=None):
        tonic = NOTE.index(tonic)
        chord = MAJOR if chord is None else chord
        degree = 0

        chords = []

        chords.append(NOTE[(tonic + chord[0]) % 12])
        chords.append(NOTE[(tonic + chord[1]) % 12])
        chords.append(NOTE[(tonic + chord[2]) % 12])

        return chords

    def set_progression(self, progression=None, tempo=120):
        if progression is None:
            progression = [0,1,2,3]

        for idx, val in enumerate(progression):
            val = val - 1
            if self.cycle[val] in self.major:
                self.chords.append(self.get_chords(self.cycle[val], MAJOR))
            elif self.cycle[val] in self.minor:
                self.chords.append(self.get_chords(self.cycle[val], MINOR))
            else:
                self.chords.append(self.get_chords(self.cycle[val], DIMINISHED))

        for idx, chord in enumerate(self.chords):
            self.midi_gen(idx, chord)

        return self.chords

    def midi_gen(self, n, notes):
        start = 0 + n * 2
        end = start + 2

        if isinstance(notes, list):
            for idx, note in enumerate(notes):
                note_to_midi = core.note_to_midi(note + "4")
                note_to_midi = midi.Note(velocity=127, pitch=(note_to_midi), start=start, end=end)
                self.inst.notes.append(note_to_midi)

                if idx == 1:
                    note_to_midi = core.note_to_midi(note + "3")
                    note_to_midi = midi.Note(velocity=127, pitch=(note_to_midi), start=start, end=end)
                    self.inst.notes.append(note_to_midi)
        elif isinstance(notes, str):
            notes = core.note_to_midi(notes + "4")
            notes = midi.Note(velocity=127, pitch=(notes), start=start, end=end)
            self.inst.notes.append(notes)

    def get_midi(self, fileName="chord", path="out/"):
        self.pretty.instruments.append(self.inst)
        self.pretty.write(path + fileName + ".mid")
        return self.pretty

happy = False
rnd_note = rnd.randint(0, len(NOTE)-1)
rnd_mode = rnd.randint(0, 2) if happy else rnd.randint(3, len(MODES) - 1)
rnd_prog = rnd.randint(0, len(HARMONY_PROGRESSION) - 1)

b = Fifth(NOTE[rnd_note], MODES[rnd_mode].name)
b.set_progression(HARMONY_PROGRESSION[rnd_prog][0])
b.get_midi(NOTE[rnd_note] + "_" + MODES[rnd_mode].name + "_" + HARMONY_PROGRESSION[rnd_prog][1])
#b.get_midi()
