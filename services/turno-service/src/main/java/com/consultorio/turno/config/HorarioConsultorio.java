package com.consultorio.turno.config;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** Reglas de horario de atención del consultorio. */
public class HorarioConsultorio {

    private static final Locale ESPANOL = Locale.of("es", "AR");

    private final LocalTime apertura;
    private final LocalTime cierre;
    private final Set<DayOfWeek> dias;

    public HorarioConsultorio(LocalTime apertura, LocalTime cierre, Set<DayOfWeek> dias) {
        if (!apertura.isBefore(cierre)) {
            throw new IllegalArgumentException("La hora de apertura debe ser anterior a la de cierre");
        }
        this.apertura = apertura;
        this.cierre = cierre;
        this.dias = EnumSet.copyOf(dias);
    }

    public static HorarioConsultorio desde(ConsultorioProperties propiedades) {
        Set<DayOfWeek> dias = EnumSet.noneOf(DayOfWeek.class);
        propiedades.diasAtencion().forEach(d -> dias.add(DayOfWeek.valueOf(d.trim().toUpperCase(Locale.ROOT))));
        return new HorarioConsultorio(LocalTime.parse(propiedades.apertura()),
                LocalTime.parse(propiedades.cierre()), dias);
    }

    /** ¿El intervalo [inicio, fin] cae completamente dentro del horario de atención de un mismo día? */
    public boolean permite(LocalDateTime inicio, LocalDateTime fin) {
        return dias.contains(inicio.getDayOfWeek())
                && inicio.toLocalDate().equals(fin.toLocalDate())
                && !inicio.toLocalTime().isBefore(apertura)
                && !fin.toLocalTime().isAfter(cierre);
    }

    /** Ej.: "lunes, martes, miércoles, jueves y viernes de 08:00 a 20:00". */
    public String descripcion() {
        List<String> nombres = dias.stream().map(d -> d.getDisplayName(TextStyle.FULL, ESPANOL)).toList();
        String listaDias = nombres.size() == 1
                ? nombres.getFirst()
                : String.join(", ", nombres.subList(0, nombres.size() - 1)) + " y " + nombres.getLast();
        return listaDias + " de " + apertura + " a " + cierre;
    }

    public LocalTime getApertura() {
        return apertura;
    }

    public LocalTime getCierre() {
        return cierre;
    }

    public Set<DayOfWeek> getDias() {
        return Set.copyOf(dias);
    }
}
