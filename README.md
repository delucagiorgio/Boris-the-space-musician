BORIS, the space musician
-------------------------
##### A project by Bombaci Nicola, Colombo Erica, De Luca Giorgio for Advanced User Interface project, under the supervision of Fabio Catania, Pietro Crovari and Eleonora Beccaluva

The web app's aim is to provide an experience to the user, who can create a simple melody with his/her voice.

Boris has been specifically designed for people with motor impairment and it is the result of the partecipatory design process with Giovanni, a man with spastic tetraparesis. With Giovanni we decided the main features of the application to achieve the best accessibility of the system, making his point of view (of a person dealing with that kind of impairments) the key of our work.

Developing Boris meant collaborate with Giovanni's parents and a psychologist too: both are experts of dailylife of these people and they helped us to understand what does it mean "working with disabilities".

The user can interact with Boris just by using her/his voice. Boris invites her/him to sing a song and it is able to create an orginal melody that follows the sung one and is in-tune with a chord progression selected by the user.(for more information about that topic download pptx here https://github.com/delucagiorgio/melpody/blob/master/cmrm.melpody/src/resources/Melpody.pptx)

The app is thought both for single players and group of players. In this way, it promotes engagement and inclusion.

Fun is guaranteed. Try it to believe!

Before you begin
-------------------

To use Boris you must first clone or download the repository.

## Create a new virtual enviroment(optional)

Follow the following instruction according to your operative system.
https://docs.conda.io/projects/conda/en/latest/user-guide/install/index.html#regular-installation

Set the root of the environment on the Boris project location.

After the installation be sure to activate your new virtual enviroment before starting: when you will do that, go on the next steps.

### Dependencies
##### Python
- pretty_midi (pip install pretty_midi)
- dialogflow (pip install dialogflow)
- librosa (pip install librosa)
- scipy (https://www.scipy.org/install.html)
  
  
##### Javascript
- Tone.js (https://github.com/Tonejs/Tone.js)
- hark (https://github.com/otalk/hark)

For each dependencies, be sure to read the related documentation in order to know if more dependencies are missing.

Supported version
------------------

Python >= 3.5

Installation
------------

Flask installation: we need Flask to run the server. Install Flask using the command "pip install Flask".

Configuration of Flask
----------------------

From the terminal, execute these lines in order to provide Flask the right information about the project location.

$ export FLASK_APP=flask_app.py

Note: if the structure of the enviroment and the downloaded repository are unchanged, the above line is the correct command to be used from the terminal

Start of the application
------------------------
$ flask run

or 

$ python -m flask run
