import numpy as np
import pretty_midi
import librosa as lb
import librosa.core as core
import scipy.signal as filt

from sys import argv, maxsize

# VARIABILI GLOBALI PER IL CONTROLLO DELLE PRINCIPALI IMPOSTAZIONI DI PITCH TRACKING E CREAZIONE DELLE NOTE MIDI
TIME_THRESHOLD_NOTE_CREATION=0.00
WINDOW_MEDIAN_LENGTH=31
THRESHOLD_MAGNITUDE =3

# Crea una note midi aggiungendola alla traccia passata come parametro; la nota è effettivamente inserita se rispetta la soglia di lunghezza imposta dalla variabile globale
def create_note(new_note, start_time, end_time, piano):
	if end_time - start_time > TIME_THRESHOLD_NOTE_CREATION:
		note = pretty_midi.Note(velocity=127, pitch=(new_note), start=start_time, end=end_time)
		piano.notes.append(note)

# Splitta un array x seconda la condizione x!=0
def split(list):
	return [x for x in list if x != 0]

# restituisce la nota MIDI (int) corrispondente alla stima del pitch, quantizzato sulla note più vicina tramite la funzione hz_to_note
def get_note(note_freq):
	return core.note_to_midi(core.hz_to_note(note_freq))

# Trasforma i pitch in note MIDI
def pitches_to_midi(pitch_array):
	chroma_midi = pretty_midi.PrettyMIDI(initial_tempo=int(tempo_var))
	piano_program = pretty_midi.instrument_name_to_program('Acoustic Grand Piano')
	piano = pretty_midi.Instrument(program=piano_program)

	end=0.0
	vi = 0
	last_note = 0
	end_last_note = 0
	start_last_note = 0
	still_evaluating = 0
	# per ogni frame disponibile
	for _i, pitch_frame_audio in enumerate(pitch_array):
		# aggiorno il valore dell'end
		end += D/nframe


		if pitch_frame_audio != 0:
			#prima nota valida, salvo info riguardo la nota, lo start e la fine
			if vi == 0:
				still_evaluating = 1
				last_note = get_note(pitch_frame_audio)
				start_last_note = end
				end_last_note = end
				vi+=1

			#Se ritrovo la stessa nota di prima o l'ultima non era una nota valida
			elif last_note == 0 or last_note == get_note(pitch_frame_audio):

				#se non era valida, assegno il nuovo valore della nota e dello start
				if last_note == 0:
					last_note = get_note(pitch_frame_audio)
					start_last_note=end

				#Assegno la nuova fine della nota
				still_evaluating = 1
				end_last_note = end
				
			#Se è cambiata la nota e l'attuale è valida, scrivo la nota precedente dall'inizio della sua esecuzione fino all'istante attuale e vado avanti
			else:

				if abs(core.midi_to_hz(last_note) - pitch_frame_audio[_i-1]) <= 8 :
					#Assegno la nuova fine della nota
					still_evaluating = 1
					end_last_note = end
				else:

					still_evaluating = 0
					create_note(last_note, start_last_note, end_last_note, piano)

					last_note = get_note(pitch_frame_audio)
					start_last_note = end_last_note
					end_last_note = end
		else:
			#il pitch non è valido quindi o scrivo l'ultima nota (se diversa da 0) altrimenti aggiorno solo lo start
			if abs(core.midi_to_hz(last_note) - pitch_frame_audio[_i-1]) <= 8 :
				end_last_note = end

			if last_note != 0:
				still_evaluating = 0
				create_note(last_note, start_last_note, end_last_note, piano)

			last_note = 0
			start_last_note = end


	# In caso di ultima nota ancora in valutazione, la scrive
	if still_evaluating != 0:
		create_note(last_note, start_last_note, end_last_note, piano)


	   
	chroma_midi.instruments.append(piano)
	chroma_midi.write(path_to_midi)
	return chroma_midi

# Estrae le ampiezze massime in ogni frame e calcola i pitch corrispondenti
def extract_max(pitch_list, magnitude_list, frame_length):
	new_pitches = np.zeros_like(pitch_list[0])

	#Per ogni frame disponibile
	for i in range(0, frame_length):
		#cerca la frequenza più alta
		f_max = magnitude_list[:, i].argmax()

		if magnitude_list[f_max][i] > THRESHOLD_MAGNITUDE:
			#salva il pitch correlato
			new_pitches[i] = pitch_list[f_max][i]
		else:
			new_pitches[i] = 0

	return new_pitches

# Run the script from the command line
script, path_to_audio, path_to_midi, tempo_var = argv
np.set_printoptions(threshold=maxsize)

# `y` = audio time series
# `sr` sampling rate of `y`
y, sr = lb.load(path=path_to_audio, sr=44100, mono=True)

D = lb.get_duration(y=y, sr=sr) # durata
S = np.abs(lb.stft(y)) # spettrogramma normalizzato

#Rispettivamente gli array di pitch e ampiezze relativi ad ogni frame e suddivisi per frequenze (bins)
pitches, magnitudes = lb.core.piptrack(S=S, sr=sr, threshold=0.1, center=False)
nframe = len(pitches[0]) # nframe

#Estrae i pitch relativi alla frequenza con massima ampiezza per ogni frame
pitch_track = extract_max(pitch_list=pitches, magnitude_list=magnitudes, frame_length=nframe)

# Considero solo le frequenze diverse da zero
pitches_no_zeros =  split(list=pitch_track)

pitches_filtered = []
final_pitches = []

if not pitches_no_zeros:
	print("Not right one!")
	pass
else:
	#Applica il filtro mediano per smussare l'andamento del pitch
	pitches_filtered.append(filt.medfilt(volume=pitches_no_zeros, kernel_size=WINDOW_MEDIAN_LENGTH))
	temp = pitches_filtered[0][:]

	#Scorre l'array dei pitch originali, per trovare gli zero e inserirli nell'array di pitch filtrati
	for k, pitch_ in enumerate(pitch_track):
		if pitch_ == 0:
			#Inserisco nuovamente lo zero
			temp = list(temp[:k]) + [0] + list(temp[k:])

	final_pitches = temp

# Crea il file    
pitches_to_midi(final_pitches)