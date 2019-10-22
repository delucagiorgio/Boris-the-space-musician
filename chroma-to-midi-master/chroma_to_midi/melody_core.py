import pretty_midi as pm
import numpy as np
from sys import maxsize

MINOR_SCALE = []

def get_best_scale(notes_scale):
	scale = []
	print(notes_scale)

	possible_scales = []
	#Per ogni nota
	for i in range(0,11):
		#Per ogni modo
		for k in range(0,6):

			#Calcola la compatibilità

	return notes_scale

HARMONY_FILENAME="harmony.mid"
MELODY_FILENAME="abstract_melody.mid"
np.set_printoptions(threshold=maxsize)

#Leggo i due file midi
harm_midi = pm.PrettyMIDI(HARMONY_FILENAME)
mel_midi = pm.PrettyMIDI(MELODY_FILENAME) 

#Cerco la scala con cui creare l'astrazione melodica
all_notes = []

for note in harm_midi.instruments[0].notes:
	all_notes.append(note.pitch % 12)

best_scale = get_best_scale(list(dict.fromkeys(all_notes)))
