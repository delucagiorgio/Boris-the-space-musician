BORIS, the space musician
-------------------------
##### A project by Bombaci Nicola, Colombo Erica, De Luca Giorgio for Advanced User Interface project, under the supervision of Fabio Catania, Pietro Crovari and Eleonora Beccaluva

The web app's aim is to provide an experience to the user, who can create a simple melody with his/her voice.


Before you begin
-------------------

To use Boris you must first clone or download the repository.

## Create a new virtual enviroment

Follow the following instruction according to your operative system.
https://docs.conda.io/projects/conda/en/latest/user-guide/install/index.html#regular-installation

Set the directory of the environment on the Boris project location.

After the installation be sure to activate your new virtual enviroment before starting: when you will do that, go on the next steps.

### Dependencies
##### Python
- pretty_midi (pip install pretty_midi)
    
- dialogflow (pip install dialogflow)
  
  
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

Note: if the structure of the enviroment and the downloaded repository are unchanged, the above line is the correct command to be used from the terminal (executing it from the root of the project)

Start of the application
------------------------
$ flask run

or 

$ python -m flask run
