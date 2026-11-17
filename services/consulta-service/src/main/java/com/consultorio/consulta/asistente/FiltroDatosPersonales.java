package com.consultorio.consulta.asistente;

import java.util.List;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

/**
 * Quita datos personales identificables del texto ANTES de enviarlo al modelo de IA.
 *
 * <p>Es una protección heurística basada en patrones: detecta emails, CUIL/CUIT, DNI, teléfonos y
 * frases como "me llamo ..." o "mi nombre es ...". No puede reconocer cualquier nombre propio
 * escrito suelto; por eso además el asistente nunca recibe datos de la base y la interfaz
 * advierte que no se escriban datos personales.</p>
 */
@Component
public class FiltroDatosPersonales {

    private record Regla(Pattern patron, String reemplazo) {
    }

    private static final List<Regla> REGLAS = List.of(
            new Regla(Pattern.compile("[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+"), "[email oculto]"),
            new Regla(Pattern.compile("\\b\\d{2}-?\\d{8}-?\\d\\b"), "[CUIL oculto]"),
            new Regla(Pattern.compile("\\b\\d{1,2}\\.?\\d{3}\\.?\\d{3}\\b"), "[DNI oculto]"),
            new Regla(Pattern.compile("(?<![\\w\\[])\\+?\\d(?:[\\s\\-()]*\\d){7,}"), "[teléfono oculto]"),
            // La frase disparadora no distingue mayúsculas; los apellidos siguientes deben empezar con mayúscula
            new Regla(Pattern.compile(
                    "\\b((?iu:me llamo|mi nombre es|mi apellido es|soy el paciente|soy la paciente))\\s+"
                            + "[\\p{L}'-]+(?:\\s+\\p{Lu}[\\p{L}'-]*){0,2}"),
                    "$1 [nombre oculto]"),
            new Regla(Pattern.compile("(?iu)\\b(historia cl[ií]nica|hc|afiliado|n[uú]mero de afiliado)\\s*(n[°ºo.]*\\s*)?[:#]?\\s*[\\w-]*\\d[\\w-]*"),
                    "$1 [número oculto]"));

    /** Resultado del filtrado: el texto limpio e indicación de si se ocultó algo. */
    public record Resultado(String texto, boolean huboDatosOcultos) {
    }

    public Resultado anonimizar(String texto) {
        if (texto == null || texto.isBlank()) {
            return new Resultado("", false);
        }
        String resultado = texto;
        for (Regla regla : REGLAS) {
            resultado = regla.patron().matcher(resultado).replaceAll(regla.reemplazo());
        }
        return new Resultado(resultado, !resultado.equals(texto));
    }
}
