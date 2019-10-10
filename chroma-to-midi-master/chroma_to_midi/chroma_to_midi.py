"""
create a chromagram from an audio file and then render that chromagram to MIDI
""" 

import madmom
import numpy as np
import scipy
import scipy.signal
import pretty_midi
import librosa as lb

from sys import argv, maxsize
from os.path import exists

# Run the script from the command line
script, path_to_audio, path_to_midi, tempo_var = argv
np.set_printoptions(threshold=maxsize)

y, sr = lb.load(path=path_to_audio, sr=44100, mono=True)
# duration
D = lb.get_duration(y=y, sr=sr)

# spectogram
S = np.abs(lb.stft(y))
chroma = lb.feature.chroma_stft(S=S, sr=sr)
# nframe
nframe = len(chroma[0])

# Function to threshhold the chroma array to only the top 3 strongest pitch classes. 
def threshhold_chroma_lib(chromagram):
	# Create an array of zeros the same size/dimension as the chromagram
	chromagram_out = np.zeros((len(chromagram[0]), len(chromagram)))
	# Loop through the chroma_vector the size of the zeros array and sort for the strongest pitch centers 
	for frame, note_vector in enumerate(chromagram_out):
		best_note = 0
		best_value = 0
		for note, frame_vector in enumerate(chromagram):
			if(frame_vector[frame] > best_value): 
				best_value = frame_vector[frame]
				best_note = note
   
		chromagram_out[frame][best_note] = 10
   
	return chromagram_out

# Call the threshholding function
chroma_out = threshhold_chroma_lib(chroma)

# Function to create our MIDI file based on the above sorted chroma array
def get_note(note_vector):
	for note_index, note in enumerate(note_vector):
		if note == 10:
			return note_index

def chroma_to_midi(chromagram):
	chroma_midi = pretty_midi.PrettyMIDI(initial_tempo=int(tempo_var))
	piano_program = pretty_midi.instrument_name_to_program('Acoustic Grand Piano')
	piano = pretty_midi.Instrument(program=piano_program)
		
	start=0.0
	end=0.0
	vi = 0
	last_vector = []
	last_note = 0
	end_last_note = 0
	start_last_note = 0
	still_evaluating = 0
	# Loop through the chroma vectors of the array by their vector_index
	for vector_index, chroma_vector in enumerate(chromagram):
		# Everytime we loop through, increase the point in the MIDI file that we are writing by the framesize of the original chromagram
		end += D/nframe
		#Se è la prima nota o è cambiata la nota rispetto all'iterazione precedente, salvo l'informazione e vado avanti

		if vi == 0:
			still_evaluating = 1
			last_note = get_note(chroma_vector)
			start_last_note = 0
			end_last_note = end
			last_vector = chroma_vector

			vi+=1 
		# If the tonal centers have not changed, don't 
		if np.array_equal(chroma_vector,last_vector):
			still_evaluating = 1
			end_last_note = end
			last_vector = chroma_vector
			pass
		#Se è cambiata la nota, scrivo la nota precedente dall'inizio della sua esecuzione fino all'istante attuale e vado avanti
		else:

			vi+=1 
			still_evaluating = 0
			note = pretty_midi.Note(velocity=127, pitch=(last_note+60), start=start_last_note, end=end_last_note)
			piano.notes.append(note)
			last_note = get_note(chroma_vector)
			start_last_note = end_last_note
			end_last_note = end
			last_vector = chroma_vector

	if still_evaluating != 0:
		note = pretty_midi.Note(velocity=127, pitch=(last_note+60), start=start_last_note, end=end_last_note)
		piano.notes.append(note)

	# Add the MIDI we just made to the piano instrument   
	chroma_midi.instruments.append(piano)
	# Write the MIDI file to a filename we specified above
	chroma_midi.write(path_to_midi)
	return chroma_midi


# Run the function    
chroma_to_midi(chroma_out)