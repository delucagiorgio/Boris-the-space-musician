import os
import dialogflow_v2 as dialogflow
import wave

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "AUI Boris-20278b34fe36.json"
class BorisDialogFlow:
    project_id = None
    session_id = None
    language_code = 'it-IT'
    audio_file = None

    def __init__(self, session_id ="f77d149440d346368503518e99c2ef45", project_id='aui-boris', audio_file = None):
        self.project_id = project_id
        self.session_id = session_id
        self.audio_file = audio_file



    def detect_intent_audio(self, context_short_name='CX_LEARN_TUTORIAL'):

        """Returns the result of detect intent with an audio file as input.

        Using the same `session_id` between requests allows continuation
        of the conversation."""

        session_client = dialogflow.SessionsClient()

        # Note: hard coding audio_encoding and sample_rate_hertz for simplicity.
        audio_encoding = dialogflow.enums.AudioEncoding.AUDIO_ENCODING_LINEAR_16

        session = session_client.session_path(self.project_id, self.session_id)

        with open( self.audio_file, 'rb') as audio_file:
            input_audio = audio_file.read()

        with wave.open(self.audio_file, 'rb') as f:
            sample_rate_hertz = f.getframerate()

        context_name = "projects/" + self.project_id + "/agent/sessions/" + self.session_id + "/contexts/" + \
                       context_short_name.lower()

        context_1 = dialogflow.types.context_pb2.Context(
            name=context_name,
            lifespan_count=1,
        )

        query_params = {"contexts": [context_1]}

        audio_config = dialogflow.types.InputAudioConfig(
            audio_encoding=audio_encoding, language_code=self.language_code,
            sample_rate_hertz=sample_rate_hertz)
        query_input = dialogflow.types.QueryInput(audio_config=audio_config)


        try:
            response = session_client.detect_intent(
                session=session, query_input=query_input,
                input_audio=input_audio, query_params=query_params)
        except:
            return 'default fallback intent'

        if response.query_result.output_contexts:
            out_context = response.query_result.output_contexts[0].name
            splitted_context = out_context.split('/')
            return splitted_context[len(splitted_context) - 1] if len(splitted_context) > 0 else None
        else:
            return 'default fallback intent'
