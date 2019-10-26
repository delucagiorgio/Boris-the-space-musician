import pretty_midi as midi
import librosa.core as core
import random as rnd

class Mode:
    root = None
    offset = None
    name = None
    seq = None

    def __init__(self, root=None, offset=None, name=None, mode=None):
        self.root=root
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

MAJOR      = [1, 3, 5]
MINOR      = [1, 2, 5]
DIMINISHED = [1, 2, 4]
AUGMENTED  = [1, 2, 6]

NOTE = ["C" , "C#" , "D" , "D#" , "E" , "F" , "F#" , "G" , "G#" , "A" , "A#" , "B"]

# Ordered from major to minor
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
    def __init__(self, root=None, mode=None, tempo=120):
        self.root  = NOTE.index("C") if root is None else NOTE.index(root)
        self.mode = [x for x in MODES if x.root == "C"][0] if mode is None else [x for x in MODES if x.name == mode][0]
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
            fifths.append(NOTE[self.root])

        degree = 0

        if len(fifths) < 12:
            for idx, val in enumerate([x.seq for x in MODES if x.name == IONIAN][0]):

                if val == 1:
                    degree += 1

                    if degree == 5:
                        fifths.append(NOTE[self.root])
                        return self.circle(fifths)

                self.root = (self.root + 1) % len(NOTE)
                if self.root > len(NOTE) - 1:
                    self.root = 0

        self.major.append(fifths[-1 + self.mode.offset])
        self.major.append(fifths[0 + self.mode.offset])
        self.major.append(fifths[1 + self.mode.offset])

        self.minor.append(fifths[2 + self.mode.offset])
        self.minor.append(fifths[3 + self.mode.offset])
        self.minor.append(fifths[4 + self.mode.offset])

        self.diminished.append(fifths[5 + self.mode.offset])

        self.fifths = fifths
        self.root = NOTE.index(fifths[0])

        # REORDER SCALE DEGREE
        self.cycle.append(NOTE[self.root]) # I DEGREE
        for i in range(1,12): # FROM II - VII DEGREE
            cur = (self.root + i) % len(NOTE)
            if len(self.cycle) <= 7:
                if  NOTE[cur] in self.major or NOTE[cur] in self.minor or NOTE[cur] in self.diminished:
                    self.cycle.append(NOTE[cur])


    def get_chords(self, root, chord=None):
        root = NOTE.index(root)
        chord = MAJOR if chord is None else chord
        degree = 0

        chords = []
        for idx, val in enumerate(self.mode.seq):

            if val == 1:
                degree += 1
                if degree in chord:
                    chords.append(NOTE[root])

            root = (root + 1) % len(NOTE)
            if root > len(NOTE) - 1:
                root = 0
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

        for chord in self.chords:
            self.midi_gen(chord)

        return self.chords

    def midi_gen(self, notes, start=0, end=2):
        if len(self.inst.notes) > 0:
            if isinstance(notes, list):
                start = len(self.inst.notes)/len(notes) * end
                end = start + 2
            elif isinstance(notes, str):
                start = len(self.inst.notes) * end
                end = start + 2

        if isinstance(notes, list):
            for note in notes:
                note = core.note_to_midi(note + "4")
                note = midi.Note(velocity=127, pitch=(note), start=start, end=end)
                self.inst.notes.append(note)
        elif isinstance(notes, str):
            notes = core.note_to_midi(notes + "4")
            notes = midi.Note(velocity=127, pitch=(notes), start=start, end=end)
            self.inst.notes.append(notes)

    def get_midi(self, fileName="chord", path="out/"):
        self.pretty.instruments.append(self.inst)
        self.pretty.write(path + fileName + ".mid")
        return self.pretty

# print(fifths)
happy = False
rnd_note = rnd.randint(0, 2) if happy else rnd.randint(3, len(MODES) - 1)
rnd_mode = rnd.randint(0, 2) if happy else rnd.randint(3, len(MODES) - 1)
rnd_prog = rnd.randint(0, len(HARMONY_PROGRESSION) - 1)

b = Fifth(MODES[rnd_note].root, MODES[rnd_mode].name)
b.set_progression(HARMONY_PROGRESSION[rnd_prog][0])
#b.get_midi(modes[rnd_mode].root + "_" + progression[rnd_prog][1])
b.get_midi()