import pretty_midi as pm
import numpy as np
import random
from sys import maxsize

MAJOR_SCALE = [[2,2,1,2,2,2,1], True]
MINOR_MELODIC_SCALE = [[2,1,2,2,2,2,1], False]
SCALE_INTERVALS = [MAJOR_SCALE,MINOR_MELODIC_SCALE]
STRONG_GRADES = [0,2,4,6]
WEAK_GRADES = [1,3,5]
THRESHOLD_NOVELTY = 0.90
BAR_LENGTH = 2.0
GRADES = [WEAK_GRADES, STRONG_GRADES]

def get_notes_from_scale(selected_scale, mel_note):

	scale_notes = []

	for index,note in enumerate(selected_scale):
		pitch_note = int(mel_note.pitch - mel_note.pitch % 12) + note

		#	Se il grando è inferiore rispetto al precedente, 
		#	per costruzione implica che si trovi un ottava sopra
		if index > 0 and selected_scale[index - 1] > note:
			pitch_note = pitch_note + 12

		same_range_note = pm.Note(pitch=pitch_note, velocity=mel_note.velocity, start=mel_note.start, end=mel_note.end)

		scale_notes.append(same_range_note)
	return scale_notes

def intersection(lst1, lst2): 

    return list(set(lst1) & set(lst2))


#	Data la scala scelta per la melodia, la distanza in termini di pitch, calcola le possibili
#	note compatibili nel range definito. In caso di prima nota è considerata tutta la scala.
def get_possible_note(selected_scale, delta, note_prev, mel_note, prev_mel_note, best_scales):

	scale_notes = get_notes_from_scale(selected_scale, mel_note)
	possible_notes = []
	#	Se la nota precedente non esiste, prendi tutta la scala come possibile range di note
	#	Altrimenti considera solo le note nel range

	print("##############################")

	if note_prev and prev_mel_note:
		print("Selezione su range")

		min_key_midi = note_prev.pitch + 1
		max_key_midi = note_prev.pitch + int(delta * 2.5)
		
		if min_key_midi > max_key_midi:
			min_key_midi = max_key_midi
			max_key_midi = note_prev.pitch
		
		#	Se il delta è diverso da zero, la melodia richiede uno spostamento,
		#	quindi si rimuove la nota creata precedentemente, se presente nella 
		#	scala in valutazione
		if delta != 0.0:
			index_prev_note =  None
			for note in scale_notes:
				if note.pitch == note_prev.pitch:
					index_prev_note = note

			if index_prev_note:
				scale_notes.remove(index_prev_note)

		print("min ", min_key_midi, " max " , max_key_midi)
		for midi_id in range(min_key_midi, max_key_midi + 1):
			for note in scale_notes:

				if note.pitch == midi_id:
					print("aggiungo nota " , midi_id)
					possible_notes.append(note)
	else:
		print("Tutta la scala selezionata")
		possible_notes = scale_notes
	
	print("Range note possibili: ", len(possible_notes))

	print("##############################")

	return possible_notes

#	Cerca il gruppo di gradi più forte possibile
def get_default_case(possible_grades):

	grades_default = intersection(possible_grades, GRADES[1])
	print("Strong grade")	
	if not grades_default:
		grades_default = intersection(possible_grades, GRADES[0])
		print("Weak grade")

	return grades_default

#	Seleziono la nota in base alla sua lunghezza
def select_compatible_grades(possible_grades, mel_note_len, novelty):

	acceptable_grades = []
	#	Dai sedicesimi alle più veloci
	if mel_note_len <= BAR_LENGTH / 8.0 or novelty:
		print("Weak grade")
		acceptable_grades = intersection(possible_grades, GRADES[0])
	#	Dai quarti alle più lunghe
	elif mel_note_len > BAR_LENGTH / 4.0:
		print("Strong grade")
		acceptable_grades = intersection(possible_grades, GRADES[1])

	if not acceptable_grades:
		print("DEFAULT")
		acceptable_grades = get_default_case(possible_grades) 

	print("AFTER DEFAULT: ", acceptable_grades)
	return acceptable_grades


#	Seleziona casualmente uno dei gradi compatibili
def get_output_note(compatible_grades, possibile_notes):

	selected_note = None

	selected_grade = random.choice(compatible_grades)

	for note in possibile_notes:
		if int((note.pitch % 12) % 7) == selected_grade:
			selected_note = note

	print(pm.note_number_to_name(selected_note.pitch))
	return selected_note


#	Calcola quali sono le scale migliori da poter utilizzare per la creazione della melodia
def get_best_scales(notes_scale):
	max_compatibility = 0
	tonic_mode_list = []
	
	#	Per ogni nota
	for tonic in range(12):
		
		#	Per ogni modo
		for mode_offset in range(7):
			now_compatibility = 0
			
			#	Calcola la compatibilità
			for scale in SCALE_INTERVALS:

				for grade in scale[0]:

					#	Se la note è presente nella sequenza di note presente nell'armonia, aumento la compatibilità della scala
					if (tonic + mode_offset + grade % 12) in notes_scale:
						now_compatibility = now_compatibility + 1
				
				#	Una volta calcolata la compatibilità totale della scala, la confronto con la precedente: 
				#	se la massima compatibilità precedente è minore dell'attuale, resetto l'array e aggiungo 
				#	la nuova scala con compatibilità maggiore
				if max_compatibility < now_compatibility:
					tonic_mode_list = [[tonic, mode_offset]]	
					max_compatibility = now_compatibility	

				#	Se le compatibilità sono le stesse, aggiungo la scala alla lista di scale ugualmente compatibili
				elif max_compatibility == now_compatibility:
					tonic_mode_list.append([tonic, mode_offset, scale[1]])

			#	Altrimenti scarto la scala e vado alla prossima

	#	Calcolo le note delle scale compatibili

	#	NB:questo passaggio non può essere evitato dato che abbiamo bisogno delle informazioni
	#		relative alla tonica e al modo compatibili, disponibili solo successivamente alla valutazione
	#		delle scale compatibili
	possible_scales = []
	
	for scale in tonic_mode_list:
		scale_arr = [scale[0]]
		additive_offset = 0

		index_color = 0

		#	Se non è true cambia l'indice per prendere la scala minore
		if not scale[1]:
			index_color = 1

		#	il range è fino a 6 perchè non riaggiungo la tonica, già aggiunta con scale_arr = [scale[0]]
		for i in range(6):

			additive_offset = additive_offset + SCALE_INTERVALS[index_color][0][(scale[1] + i) % 7]
			scale_arr.append((int(scale[0]) + additive_offset) % 12)

		possible_scales.append(scale_arr)

	return possible_scales


np.set_printoptions(threshold=maxsize)

#	Leggo i due file midi
harm_midi = pm.PrettyMIDI(HARMONY_FILENAME)
mel_midi = pm.PrettyMIDI(MELODY_FILENAME) 

#	Carica la scala con cui creare l'astrazione melodica
all_notes_harmony = []

for note in harm_midi.instruments[0].notes:
	#	Basta ottenere le note premute con un modulo
	all_notes_harmony.append(int(note.pitch % 12))

#	Calcola le tutte le scale compatibili
best_scales = get_best_scales(list(dict.fromkeys(all_notes_harmony)))

all_notes_melody = []

#	Carico le informazioni relative alla melodia
for note in mel_midi.instruments[0].notes:
	#	Basta ottenere le note premute con un modulo
	all_notes_melody.append(note)


#	Analizzo il file di melodia per ogni nota: in base alla lunghezza della nota,
#	assegno un grado della scala selezionata relativamente alla natura del grado stesso 
#	(Gradi forti: 1°,3°, 5° - Gradi intermedi: 6°,7° - Gradi di tensione: 2°, 4°).
#	La durata della nota invece rimane invariata.
#	Il range di note possibili dipende dalla melodia MIDI: la distanza tra 

#	mel_note - note_prev

#	determina l'offset di note possibile rispetto all'ultima nota creata.
#	La prima nota è creata bypassando questo controllo, limitando quindi la scelta 
#	alla natura del grado rispetto alla sua velocità


#	Seleziona una scala casualmente
#	Le celle corrispondono precisamente ai gradi della scala rispetto alla tonica all'indice 0
# 0 : primo grado
# 1 : secondo grado
# ...
# 6 : settimo e ultimo grado
selected_scale = random.choice(best_scales)

print("Scala selezionata: ", selected_scale)

note_prev = None
output_midi = pm.PrettyMIDI()
piano_program = pm.instrument_name_to_program('Acoustic Grand Piano')
inst = pm.Instrument(program=piano_program)

print("----------------------------------------")

for index, mel_note in enumerate(all_notes_melody):
	
	delta = None
	print("Nota ", index)
	#	Attiva l'inversione di natura di grado tra gradi forti e gradi deboli,
	#	favorendo quindi la scelta dei secondi riprestto ai primi
	novelty = random.uniform(0, 1) >= THRESHOLD_NOVELTY
	print("Novelty: ", novelty)
	print("Note_prev: ", note_prev)
	

	if note_prev:
		delta = mel_note.pitch - all_notes_melody[index - 1].pitch
	
	print("Delta: ", delta)

	#	Seleziono le note interne al range dalla scala scelta per la 
	#	creazione della	melodia
	possible_notes = get_possible_note(selected_scale, delta, note_prev, mel_note, all_notes_melody[index - 1], best_scales)

	tries = 0

	while not possible_notes and best_scales and tries < 150:
		tries = tries + 1
		print("Prova un altra scala: tentativo ", tries)
		best_scales.remove(selected_scale)
		selected_scale = random.choice(best_scales)
		possible_notes = get_possible_note(selected_scale, delta, note_prev, mel_note, all_notes_melody[index - 1], best_scales)


	print("Note possibili: ", len(possible_notes), possible_notes)

	possible_grades = []
	
	for _note in possible_notes:
		#	Basta ottenere le note premute con un modulo
		possible_grades.append(int((_note.pitch % 12) % 7))

	
	print("Gradi possibili: ", len(possible_grades), possible_grades)

	mel_note_len = mel_note.end - mel_note.start

	#	Seleziona la nota rispetto ai gradi trovati
	selected_note = get_output_note(select_compatible_grades(possible_grades, mel_note_len, novelty), possible_notes)

	inst.notes.append(selected_note)

	note_prev = selected_note
	print("----------------------------------------")

output_midi.instruments.append(inst)

output_midi.write('output_melody.mid')
