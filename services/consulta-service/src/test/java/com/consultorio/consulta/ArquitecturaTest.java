package com.consultorio.consulta;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

/**
 * Reglas de arquitectura verificadas automáticamente.
 * Garantizan que el asistente de IA no puede acceder a datos clínicos ni de pacientes.
 */
@AnalyzeClasses(packages = "com.consultorio.consulta", importOptions = ImportOption.DoNotIncludeTests.class)
class ArquitecturaTest {

    @ArchTest
    static final ArchRule elAsistenteNoAccedeAConsultasNiAOtrosServicios = noClasses()
            .that().resideInAPackage("..consulta.asistente..")
            .should().dependOnClassesThat().resideInAnyPackage(
                    "..consulta.dominio..",   // entidades y repositorios de consultas (datos clínicos)
                    "..consulta.servicio..",  // lógica de consultas
                    "..consulta.cliente..",   // clientes REST hacia otros microservicios
                    "..consulta.api..")       // controladores/DTOs de consultas
            .because("el asistente no debe leer historias clínicas ni datos personales de pacientes");

    @ArchTest
    static final ArchRule elAsistenteNoUsaJpa = noClasses()
            .that().resideInAPackage("..consulta.asistente..")
            .should().dependOnClassesThat().resideInAnyPackage("jakarta.persistence..", "org.springframework.data..")
            .because("el asistente no debe tener acceso a ninguna base de datos");
}
