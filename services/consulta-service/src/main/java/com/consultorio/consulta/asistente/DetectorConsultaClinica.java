package com.consultorio.consulta.asistente;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

/**
 * Detecta, con reglas fijas, si un mensaje pide información clínica (síntomas, diagnósticos,
 * tratamientos o medicamentos) o describe una posible urgencia.
 *
 * <p>Si lo detecta, el asistente responde con un mensaje seguro predefinido y el texto
 * <b>no se envía al modelo</b>. Así la restricción no depende de que el modelo "obedezca":
 * es una barrera determinista, fácil de probar y de auditar.</p>
 */
@Component
public class DetectorConsultaClinica {

    public enum Tipo {
        ADMINISTRATIVA,
        CLINICA,
        URGENCIA
    }

    /** Señales de posible urgencia (se evalúan primero). Escritas sin tildes y en minúsculas. */
    private static final List<Pattern> URGENCIA = patrones(
            "dolor (fuerte )?(en el|de) pecho", "no puedo respirar", "me falta el aire", "falta de aire",
            "desmay", "convulsi", "perdi el conocimiento", "sangrado (abundante|fuerte|que no para)",
            "infarto", "acv\\b", "me quiero morir", "suicid", "quitarme la vida", "sobredosis", "envenen",
            "emergencia", "urgencia");

    /**
     * Señales de consulta clínica. Se buscan al comienzo de palabra; algunas llevan exclusiones
     * para no confundir frases administrativas ("¿qué tengo que llevar?", "tomar un turno").
     */
    private static final List<Pattern> CLINICA = patrones(
            "sintoma", "me duele", "duele", "dolor", "fiebre", "tos\\b", "mareo", "nausea", "vomit", "diarrea",
            "sangr", "presion alta", "presion baja", "infeccion", "inflamad", "alergi", "erupcion", "picazon",
            "granito", "lunar(es)?\\b", "me siento mal", "estoy enfermo", "estoy enferma", "contagi", "virus",
            "diagnostic", "que (enfermedad )?tengo\\b(?! que)(?! para)", "sera grave", "es grave",
            "tratamiento", "tratarme", "curarme", "cura para", "medicamento", "medicacion", "remedio",
            "pastilla", "dosis", "miligramo", "antibiotico", "antiinflamatorio", "ibuprofeno", "paracetamol",
            "amoxicilina", "aspirina", "insulina", "que (puedo |me conviene |deberia )?tomar\\b(?! (un|el|otro) turno)",
            "que tomo\\b", "me recetas", "recetame", "automedic");

    public Tipo clasificar(String mensaje) {
        String texto = normalizar(mensaje);
        if (URGENCIA.stream().anyMatch(p -> p.matcher(texto).find())) {
            return Tipo.URGENCIA;
        }
        if (CLINICA.stream().anyMatch(p -> p.matcher(texto).find())) {
            return Tipo.CLINICA;
        }
        return Tipo.ADMINISTRATIVA;
    }

    /** Minúsculas y sin tildes, para que "Síntoma", "sintoma" y "SÍNTOMA" se traten igual. */
    static String normalizar(String texto) {
        if (texto == null) {
            return "";
        }
        String sinTildes = Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return sinTildes.toLowerCase(Locale.ROOT);
    }

    private static List<Pattern> patrones(String... expresiones) {
        return java.util.Arrays.stream(expresiones)
                .map(e -> Pattern.compile("\\b" + e))
                .toList();
    }
}
