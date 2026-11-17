package com.consultorio.consulta.asistente;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class FiltroDatosPersonalesTest {

    private final FiltroDatosPersonales filtro = new FiltroDatosPersonales();

    @Test
    void ocultaEmailDniCuilYTelefono() {
        var r = filtro.anonimizar("Soy Ana, mi DNI es 30.111.222, CUIL 27-30111222-4, "
                + "mail ana.torres@correo.com y celular +54 9 11 5555-1234");

        assertThat(r.huboDatosOcultos()).isTrue();
        assertThat(r.texto())
                .doesNotContain("30.111.222", "30111222", "ana.torres@correo.com", "5555-1234")
                .contains("[DNI oculto]", "[CUIL oculto]", "[email oculto]", "[teléfono oculto]");
    }

    @Test
    void ocultaDniSinPuntos() {
        assertThat(filtro.anonimizar("dni 40123456").texto()).isEqualTo("dni [DNI oculto]");
    }

    @Test
    void ocultaNombresPresentadosExplicitamente() {
        var r = filtro.anonimizar("Hola, me llamo Lucía Romero y quiero un turno");

        assertThat(r.texto()).isEqualTo("Hola, me llamo [nombre oculto] y quiero un turno");
    }

    @Test
    void ocultaNumerosDeHistoriaClinicaYAfiliado() {
        assertThat(filtro.anonimizar("mi historia clínica 55-1234").texto()).doesNotContain("55-1234");
        assertThat(filtro.anonimizar("número de afiliado: A12345").texto()).doesNotContain("A12345");
    }

    @Test
    void noModificaPreguntasSinDatosPersonales() {
        var r = filtro.anonimizar("¿Cuál es el horario de atención? ¿Atienden a las 8:30?");

        assertThat(r.huboDatosOcultos()).isFalse();
        assertThat(r.texto()).isEqualTo("¿Cuál es el horario de atención? ¿Atienden a las 8:30?");
    }
}
