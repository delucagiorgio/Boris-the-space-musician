"""
create a chromagram from an audio file and then render that chromagram to MIDI
""" 
import numpy as np
import pretty_midi
import librosa as lb
import librosa.core as core
import matplotlib.pyplot as plt 
import scipy.signal as filt

from sys import argv, maxsize
from os.path import exists

# VARIABILI GLOBALI PER IL CONTROLLO DELLE PRINCIPALI IMPOSTAZIONI DI PITCH TRACKING E CREAZIONE DELLE NOTE MIDI
TIME_THRESHOLD_NOTE_CREATION=0.07
WINDOW_MEDIAN_LENGTH=11
THRESHOLD_MAGNITUDE =5

# Crea una note midi aggiungendola alla traccia passata come parametro; la nota è effettivamente inserita se rispetta la soglia di lunghezza imposta dalla variabile globale
def create_note(new_note, start_time, end_time, piano):
	if end_time - start_time > TIME_THRESHOLD_NOTE_CREATION:
		note = pretty_midi.Note(velocity=127, pitch=(new_note), start=start_time, end=end_time)
		piano.notes.append(note)

# Splitta un array x seconda la condizione x<5, ad esempio
def split(arr, cond):
  return [arr[cond], arr[~cond]]

# restituisce la nota MIDI (int) corrispondente alla stima del pitch, quantizzato sulla note più vicina tramite la funzione hz_to_note
def get_note(note_freq):
	return core.note_to_midi(core.hz_to_note(note_freq))

# Trasforma i pitch in note MIDI
def pitches_to_midi(pitch_array):
	chroma_midi = pretty_midi.PrettyMIDI(initial_tempo=int(tempo_var))
	piano_program = pretty_midi.instrument_name_to_program('Acoustic Grand Piano')
	piano = pretty_midi.Instrument(program=piano_program)
		
	start=0.0
	end=0.0
	vi = 0
	last_note = 0
	end_last_note = 0
	start_last_note = 0
	still_evaluating = 0
	# per ogni frame disponibile
	for vector_index, pitch_frame_audio in enumerate(pitch_array):
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

				still_evaluating = 0
				create_note(last_note, start_last_note, end_last_note, piano)

				last_note = get_note(pitch_frame_audio)
				start_last_note = end_last_note
				end_last_note = end
		else:
			#il pitch non è valido quindi o scrivo l'ultima nota (se diversa da 0) altrimenti aggiorno solo lo start
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
def extract_max(pitch_array, length_pitches):
	new_pitches = np.zeros_like(pitch_array[0])

	#Per ogni frame disponibile
	for i in range(0, length_pitches):
		#cerca la frequenza più alta
		index = magnitudes[:, i].argmax()

		if magnitudes[index][i] > THRESHOLD_MAGNITUDE:
			#salva il pitch correlato
			new_pitches[i] = pitch_array[index][i]
		else:
			new_pitches[i] = 0

	return new_pitches

# Run the script from the command line
script, path_to_audio, path_to_midi, tempo_var = argv
np.set_printoptions(threshold=maxsize)

y, sr = lb.load(path=path_to_audio, sr=48000, mono=True)
# durata
D = lb.get_duration(y=y, sr=sr)
# Spettro
S = np.abs(lb.stft(y))

#Rispettivamente gli array di pitch e ampiezze relativi ad ogni frame e suddivisi per frequenze (bins)
pitches, magnitudes = lb.core.piptrack(S=S, sr=sr)

# nframe
nframe = len(pitches[0])

#Estrae i pitch relativi alla frequenza con massima ampiezza per ogni frame
pitch_track = extract_max(pitches, nframe)

# Considero solo le frequenze diverse da zero
pitches_no_zeros = split(pitch_track, cond=pitch_track==0)

pitches_filtered = []
final_pitches = []

#Per ogni array di pitch validi
for index in range(0, len(pitches_no_zeros)):
	if pitches_no_zeros[index][0] == 0:
		print("Not right one!")
		pass
	else:
		#Applica il filtro mediano per smussare l'andamento del pitch
		pitches_filtered.append(filt.medfilt(pitches_no_zeros[index], WINDOW_MEDIAN_LENGTH))
		temp = pitches_filtered[:]

		#Scorre l'array dei pitch originali, per trovare gli zero e inserirli nell'array di pitch filtrati
		for k in range(0, len(pitch_track)):
			if pitch_track[k] == 0:
				#Inserisco nuovamente lo zero
				temp[0] = list(temp[0][:k]) + [0] + list(temp[0][k:])
		
		final_pitches = temp[0]	

# Crea il file    
pitches_to_midi(final_pitches)