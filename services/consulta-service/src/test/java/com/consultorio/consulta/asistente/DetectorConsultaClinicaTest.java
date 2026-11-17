package com.consultorio.consulta.asistente;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import com.consultorio.consulta.asistente.DetectorConsultaClinica.Tipo;

class DetectorConsultaClinicaTest {

    private final DetectorConsultaClinica detector = new DetectorConsultaClinica();

    @ParameterizedTest
    @ValueSource(strings = {
            "Tengo fiebre hace dos días, ¿qué hago?",
            "Me duele mucho la cabeza",
            "¿Qué SÍNTOMAS tiene la gripe?",
            "¿Cuántos miligramos de ibuprofeno puedo tomar?",
            "¿Qué remedio me recomendás para la tos?",
            "¿Me podés dar un diagnóstico?",
            "¿Qué tratamiento sirve para la alergia?",
            "Tengo un lunar raro, ¿es grave?"
    })
    void detectaPreguntasClinicas(String mensaje) {
        assertThat(detector.clasificar(mensaje)).isEqualTo(Tipo.CLINICA);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Tengo un dolor fuerte en el pecho",
            "No puedo respirar bien",
            "Mi papá se desmayó",
            "Es una emergencia"
    })
    void detectaPosiblesUrgencias(String mensaje) {
        assertThat(detector.clasificar(mensaje)).isEqualTo(Tipo.URGENCIA);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "¿Cuál es el horario de atención?",
            "¿Cómo pido un turno?",
            "¿Qué tengo que llevar al turno?",
            "¿Puedo tomar un turno para el sábado?",
            "¿Cómo cancelo un turno?",
            "¿Dónde veo mis turnos en el sistema?",
            "¿Atienden pediatría?"
    })
    void dejaPasarPreguntasAdministrativas(String mensaje) {
        assertThat(detector.clasificar(mensaje)).isEqualTo(Tipo.ADMINISTRATIVA);
    }
}
