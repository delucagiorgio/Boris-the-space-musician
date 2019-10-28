import pretty_midi as pm
import random

from engine.assets import music_assets as music


STRONG_GRADES = []
WEAK_GRADES = []
THRESHOLD_NOVELTY = 0.75
BAR_LENGTH = 2.0


def get_scale(tonic, offset):
    scale = []

    for idx, notes in enumerate(offset.seq):
        if notes == 1:
            scale.append((idx + tonic) % 12)
            if idx % 2 == 0:
                STRONG_GRADES.append((idx + tonic) % 12)
            else:
                WEAK_GRADES.append((idx + tonic) % 12)

    return scale

class Melody:
    tonic = None
    offset = None
    scale = None
    melody_notes = None

    def __init__(self, tonic=None, offset=None, melody_notes=None):
        self.tonic = music.notes.index(tonic)
        self.offset = offset
        self.scale = get_scale(self.tonic, offset)
        self.melody_notes = melody_notes.instruments[0].notes


    def get_notes_from_scale(self, mel_note, note_prev):
        scale_notes = []
        note_ref = note_prev

        if not note_ref:
            note_ref = mel_note

        for index, note in enumerate(self.scale):
            pitch_note = int(note_ref.pitch - note_ref.pitch % 12) + note

            #	Se il grado è inferiore rispetto al precedente,
            #	per costruzione implica che si trovi un ottava sopra
            if index > 0 and self.scale[index - 1] > note:
                pitch_note = pitch_note + 12

            same_range_note = pm.Note(pitch=pitch_note, velocity=mel_note.velocity, start=mel_note.start,
                                      end=mel_note.end)

            scale_notes.append(same_range_note)
        return scale_notes

    def get_possible_note(self, delta, note_prev, mel_note):
        scale_notes = self.get_notes_from_scale(mel_note, note_prev)
        possible_notes = []

        #	Se la nota precedente non esiste, prendi tutta la scala come possibile range di note
        #	Altrimenti considera solo le note nel range

        if note_prev:

            min_key_midi = note_prev.pitch
            max_key_midi = note_prev.pitch + delta

            if min_key_midi > max_key_midi:
                min_key_midi = max_key_midi
                max_key_midi = note_prev.pitch

            #	Se il delta è diverso da zero, la melodia richiede uno spostamento,
            #	quindi si rimuove la nota creata precedentemente, se presente nella
            #	scala in valutazione
            if delta != 0.0:
                index_prev_note = None
                for note in scale_notes:
                    if note.pitch == note_prev.pitch:
                        index_prev_note = note

                if index_prev_note:
                    scale_notes.remove(index_prev_note)

            for midi_id in range(min_key_midi, max_key_midi + 1):
                for note in scale_notes:

                    if note.pitch == midi_id - 12:
                        _note = pm.Note(pitch=note.pitch + 12, start=note.start, end=note.end, velocity=127)
                        possible_notes.append(_note)

                    if note.pitch == midi_id + 12:
                        _note = pm.Note(pitch=note.pitch - 12, start=note.start, end=note.end, velocity=127)
                        possible_notes.append(_note)

                    if note.pitch == midi_id:
                        possible_notes.append(note)
        else:
            possible_notes = scale_notes

        return possible_notes

    #	Cerca il gruppo di gradi più forte possibile
    def get_default_case(self, possible_grades):
        grades_default = [x for x in possible_grades if x.pitch % 12 in STRONG_GRADES]
        if not grades_default:
            grades_default = [x for x in possible_grades if x.pitch % 12 in WEAK_GRADES]
        return grades_default

    #	Seleziono la nota in base alla sua lunghezza
    def select_compatible_grades(self, possible_grades, mel_note_len):
        acceptable_grades = []
        #	Dai sedicesimi alle più veloci
        if mel_note_len <= BAR_LENGTH / 12.0:
            acceptable_grades = [x for x in possible_grades if x.pitch % 12 in WEAK_GRADES]
        #	Dai quarti alle più lunghe
        else:
            acceptable_grades = [x for x in possible_grades if x.pitch % 12 in STRONG_GRADES]

        if not acceptable_grades:
            acceptable_grades = self.get_default_case(possible_grades)

        return acceptable_grades

    #	Seleziona casualmente uno dei gradi compatibili
    def get_output_note(self, delta, note, prev_note):

        possible_notes = self.get_possible_note(delta, prev_note, note)

        possible_grades = self.select_compatible_grades(possible_notes, note.end - note.start)

        return random.choice(possible_grades)

    def create_melody(self, filename="output_melody.mid"):

        output_midi = pm.PrettyMIDI()
        piano_program = pm.instrument_name_to_program('Acoustic Grand Piano')
        inst = pm.Instrument(program=piano_program)
        prev_note = None

        for index, note in enumerate(self.melody_notes):
            delta = None
            if prev_note:
                delta = note.pitch - self.melody_notes[index - 1].pitch
                _add = 0 if delta == 0 else int(delta / abs(delta) * 2)
                delta = delta + _add

            selected_note = self.get_output_note(delta, note, prev_note)

            inst.notes.append(selected_note)
            prev_note = selected_note

        output_midi.instruments.append(inst)
        output_midi.write(filename)


MELODY_FILENAME = "out/piano.mid"
#	Leggo i due file midi
mel_midi = pm.PrettyMIDI(MELODY_FILENAME)
m = Melody(music.notes[0], music.modes[3], mel_midi)

m.create_melody()