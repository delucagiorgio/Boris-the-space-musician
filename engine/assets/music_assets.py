class Mode:
    def __init__(self, tonic=None, offset=None, name=None, mode=None):
        self.tonic = tonic
        self.name = name
        self.seq = mode
        self.offset = offset


lydian = "Lydian"
ionian = "Ionian"
myxolydian = "Myxolydian"
dorian = "Dorian"
aeolian = "Aeolian"
phrygian = "Phrygian"
locrian = "Locrian"

major = [0, 4, 7]
minor = [0, 3, 7]
diminished = [0, 3, 6]
augmented = [0, 4, 8]

notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# ORDERED FROM MAJOR TO MINOR
modes = [
    Mode("C",  0, ionian, [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1]),
    Mode("F",  1, lydian, [1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1]),
    Mode("G", -1, myxolydian, [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0]),
    Mode("D", -2, dorian, [1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0]),
    Mode("E", -4, phrygian, [1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0]),
    Mode("A", -3, aeolian, [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0]),
    Mode("B", -5, locrian, [1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0]),
]

progressions = (
    ([1, 6, 2, 5], "I-VI-II-V"),
    ([1, 4, 5, 5], "I–IV–V–V"),
    ([1, 1, 4, 5], "I–I–IV–V"),
    ([1, 4, 5, 1], "I–IV–V–I"),
    ([1, 4, 1, 5], "I–IV–I–V"),
    ([1, 4, 5, 4], "I–IV–V–IV"),
    ([1, 2, 3, 4], "I-II-III-IV")
)
