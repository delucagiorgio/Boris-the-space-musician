import numpy as np
import pretty_midi as midi
import librosa as lb
import librosa.core as core
import scipy.signal as filt

#  VARIABILI GLOBALI PER IL CONTROLLO DELLE PRINCIPALI IMPOSTAZIONI DI PITCH TRACKING E CREAZIONE DELLE NOTE MIDI
TIME_THRESHOLD_NOTE_CREATION = 2.0/32
WINDOW_MEDIAN_LENGTH = 3
THRESHOLD_MAGNITUDE = 0.2
DELTA_FREQ = 8
RATIO_FORMANT = 0.4
FMIN_PIPTRACK = 60
FMAX_PIPTRACK = 350
QUANTIZATION_UNIT = 2.0/16


class Chroma:
    frame = None
    length = None

    def __init__(self, path_audio, path_midi, tempo=120):
        self.path_audio = path_audio
        self.path_midi = path_midi
        self.tempo = tempo

        self.sample_rate = 44100
        self.mono = True

        self.pretty = midi.PrettyMIDI(initial_tempo=int(tempo))
        self.piano = midi.instrument_name_to_program('Acoustic Grand Piano')
        self.inst = midi.Instrument(program=self.piano)

    def run(self):
        #  `y` = AUDIO TIME SERIES
        #  `sr` SAMPLING RATE OF `y`
        y, sr = lb.load(path=self.path_audio, sr=self.sample_rate, mono=self.mono)

        #  DURATA
        self.length = lb.get_duration(y=y, sr=sr)
        #  SPETTROGRAMMA NORMALIZZATO
        # s = np.abs(lb.stft(y))
        s = lb.stft(y)

        #  RISPETTIVAMENTE GLI ARRAY DI PITCH E AMPIEZZE RELATIVI AD OGNI FRAME E SUDDIVISI PER FREQUENZE (BINS)
        pitches, magnitudes = \
            lb.core.piptrack(S=s, sr=sr, threshold=0.1, fmin=FMIN_PIPTRACK, fmax=FMAX_PIPTRACK, center=False)
        self.frame = len(pitches[0])

        #  ESTRAE I PITCH RELATIVI ALLA FREQUENZA CON MASSIMA AMPIEZZA PER OGNI FRAME
        pitch_track = self.extract_max(pitch_list=pitches, magnitude_list=magnitudes, frame_length=self.frame)

        #  CONSIDERO SOLO LE FREQUENZE DIVERSE DA ZERO
        pitches_no_zeros = self.split(ele=pitch_track)

        pitches_filtered = []
        final_pitches = []

        if not pitches_no_zeros:
            print("Not right one!")
            pass
        else:
            #  APPLICA IL FILTRO MEDIANO PER SMUSSARE L'ANDAMENTO DEL PITCH
            pitches_filtered.append(filt.medfilt(volume=pitches_no_zeros, kernel_size=WINDOW_MEDIAN_LENGTH))
            temp = pitches_filtered[0][:]

            #  SCORRE L'ARRAY DEI PITCH ORIGINALI, PER TROVARE GLI ZERO E INSERIRLI NELL'ARRAY DI PITCH FILTRATI
            for k, pitch_ in enumerate(pitch_track):
                if pitch_ == 0:
                    #  INSERISCO NUOVAMENTE LO ZERO
                    temp = list(temp[:k]) + [0] + list(temp[k:])

            final_pitches = temp

        #  CREA IL FILE
        self.pitches_to_midi(final_pitches)

    #  CREA UNA NOTE MIDI AGGIUNGENDOLA ALLA TRACCIA PASSATA COME PARAMETRO; LA NOTA È EFFETTIVAMENTE INSERITA SE
    #  RISPETTA LA SOGLIA DI LUNGHEZZA IMPOSTA DALLA VARIABILE GLOBALE
    def create_note(self, note, start, end):
        if end - start > TIME_THRESHOLD_NOTE_CREATION:
            if start % QUANTIZATION_UNIT != 0:
                if start % QUANTIZATION_UNIT > QUANTIZATION_UNIT / 2:
                    start = start + (QUANTIZATION_UNIT - start % QUANTIZATION_UNIT)
                    end = end + (QUANTIZATION_UNIT - start % QUANTIZATION_UNIT)
                else:
                    start = start - (start % QUANTIZATION_UNIT)
                    end = end - (start % QUANTIZATION_UNIT)

            note = midi.Note(velocity=127, pitch=note, start=start, end=end)
            self.inst.notes.append(note)

    #  SPLITTA UN ARRAY X SECONDA LA CONDIZIONE X!=0
    @staticmethod
    def split(ele):
        return [x for x in ele if x != 0]

    #  RESTITUISCE LA NOTA MIDI (INT) CORRISPONDENTE ALLA STIMA DEL PITCH, QUANTIZZATO SULLA NOTE PIÙ VICINA TRAMITE LA
    #  FUNZIONE HZ_TO_NOTE
    @staticmethod
    def get_note(note_freq):
        return core.note_to_midi(core.hz_to_note(note_freq))

    #  TRASFORMA I PITCH IN NOTE MIDI
    def pitches_to_midi(self, pitch_array):
        end = 0.0
        vi = 0
        last_note = 0
        end_last_note = 0
        start_last_note = 0
        still_evaluating = 0
        #  PER OGNI FRAME DISPONIBILE
        for _i, pitch_frame_audio in enumerate(pitch_array):
            #  AGGIORNO IL VALORE DELL'END
            end += self.length/self.frame

            if pitch_frame_audio != 0:
                # PRIMA NOTA VALIDA, SALVO INFO RIGUARDO LA NOTA, LO START E LA FINE
                if vi == 0:
                    still_evaluating = 1
                    last_note = self.get_note(pitch_frame_audio)
                    start_last_note = end
                    end_last_note = end
                    vi += 1

                # SE RITROVO LA STESSA NOTA DI PRIMA O L'ULTIMA NON ERA UNA NOTA VALIDA
                elif last_note == 0 or last_note == self.get_note(pitch_frame_audio):

                    # SE NON ERA VALIDA, ASSEGNO IL NUOVO VALORE DELLA NOTA E DELLO START
                    if last_note == 0:
                        last_note = self.get_note(pitch_frame_audio)
                        start_last_note = end

                    # ASSEGNO LA NUOVA FINE DELLA NOTA
                    still_evaluating = 1
                    end_last_note = end

                # SE È CAMBIATA LA NOTA E L'ATTUALE È VALIDA, SCRIVO LA NOTA PRECEDENTE DALL'INIZIO DELLA SUA ESECUZIONE
                # FINO ALL'ISTANTE ATTUALE E VADO AVANTI
                else:

                    if abs(core.midi_to_hz(last_note) - pitch_array[_i-1]) <= DELTA_FREQ:
                        # ASSEGNO LA NUOVA FINE DELLA NOTA
                        still_evaluating = 1
                        end_last_note = end
                    else:

                        still_evaluating = 0
                        self.create_note(last_note, start_last_note, end_last_note)

                        last_note = self.get_note(pitch_frame_audio)
                        start_last_note = end_last_note
                        end_last_note = end
            else:
                # IL PITCH NON È VALIDO QUINDI O SCRIVO L'ULTIMA NOTA (SE DIVERSA DA 0) ALTRIMENTI AGGIORNO SOLO LO START
                if _i > 0 and abs(core.midi_to_hz(last_note) - pitch_array[_i-1]) <= DELTA_FREQ:
                    end_last_note = end

                if last_note != 0:
                    still_evaluating = 0
                    self.create_note(last_note, start_last_note, end_last_note)

                last_note = 0
                start_last_note = end

        #  IN CASO DI ULTIMA NOTA ANCORA IN VALUTAZIONE, LA SCRIVE
        if still_evaluating != 0:
            self.create_note(last_note, start_last_note, end_last_note)


        self.pretty.instruments.append(self.inst)

        index = None
        while True:
            if not index:
                index = 1
            else:
                index = index + 1

            note_len = len(self.pretty.instruments[0].notes)
            if index < note_len:
                if self.pretty.instruments[0].notes[index - 1].pitch == self.pretty.instruments[0].notes[index].pitch:
                    end_prev = self.pretty.instruments[0].notes[index - 1].end
                    start_new = self.pretty.instruments[0].notes[index].start
                    if start_new - end_prev < QUANTIZATION_UNIT:
                        self.pretty.instruments[0].notes[index - 1].end = self.pretty.instruments[0].notes[index].end
                        self.pretty.instruments[0].notes.pop(index)
                        index = index - 1
            else:
                break

        self.pretty.write(self.path_midi)
        return self.pretty

    #  ESTRAE LE AMPIEZZE MASSIME IN OGNI FRAME E CALCOLA I PITCH CORRISPONDENTI
    @staticmethod
    def extract_max(pitch_list, magnitude_list, frame_length):
        new_pitches = np.zeros_like(pitch_list[0])

        # Per ogni frame disponibile
        for i in range(0, frame_length):
            # CERCA LA FREQUENZA PIÙ ALTA
            f_max = magnitude_list[:, i].argmax()

            if magnitude_list[f_max][i] > THRESHOLD_MAGNITUDE:
                # SE IL RAPPORTO DELL'AMPIEZZA DELLA SOTTOARMONICA È CONFRONTABILIE CON LA FREQUENZA TROVATA SELEZIONA LA PRIMA
                if magnitude_list[int(f_max/2)][i]/magnitude_list[int(f_max)][i] > RATIO_FORMANT:
                    f_max = int(f_max/2)

                # SALVA IL PITCH CORRELATO
                new_pitches[i] = pitch_list[f_max][i]
            else:
                new_pitches[i] = 0

        return new_pitches