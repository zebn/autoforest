# 🌲 AutoForest

> **Auto-tuning Isolation Forest for Anomaly Detection in Critical Infrastructures**

![Version](https://img.shields.io/badge/version-0.3.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey)

## 📖 Descripción

**AutoForest** es una aplicación de escritorio para la detección de anomalías en datasets de infraestructuras críticas utilizando el algoritmo **Isolation Forest** con **auto-ajuste automático de hiperparámetros**.

### 🎓 Fundamentos Científicos

Basado en la metodología de investigación:

**"Multivariate Automatic Tuning of Isolation Forest for Anomaly Detection in Critical Infrastructures"**  
📝 Autores: David Saavedra, José Vicente Berná Martínez, Lucia Arnau, Carlos Calatayud  
🏛️ Universidad de Alicante, 2024

### ✨ Características Principales

- ✅ **Arquitectura Clean** - Código organizado y escalable
- ✅ **Auto-ajuste de hiperparámetros** basado en estadísticas del dataset
- ✅ **Interfaz moderna** con Angular Material
- ✅ **Soporte multiidioma (i18n)** - Español e Inglés
- ✅ **Paginación optimizada** para datasets grandes (>10,000 registros)
- ✅ **Filtrado de anomalías** para análisis focalizado
- ✅ **Métricas de rendimiento** en tiempo real
- ✅ **Recodificación automática** de datos texto → numérico
- ✅ **Visualización interactiva** de resultados
- ✅ **Exportable** a ejecutable standalone (.exe)

## 🚀 Instalación

### Requisitos Previos

- Node.js v14+ 
- npm o yarn
- (Opcional) Git

### Instalación de Dependencias

```bash
# Clonar repositorio
git clone <repository-url>
cd tfm-repo

# Instalar dependencias del proyecto principal
npm install

# Instalar dependencias de Angular
cd renderer
npm install
cd ..
```

## 🎮 Uso

### Desarrollo

```bash
# Compilar y ejecutar
npm start

# Solo ejecutar (después de compilar)
npm run electron

# Solo compilar Angular
npm run build
```

### Producción

```bash
# Generar ejecutable para Windows
npm run dist:win

# Generar para todas las plataformas
npm run dist
```

El instalador se generará en `release/AutoForest Setup 0.2.0.exe`

## 📊 Formato de Datos

### Estructura CSV

```csv
columna1,columna2,columna3,columna4
valor1,valor2,valor3,valor4
valor5,valor6,valor7,valor8
...
```

### Ejemplo: Datos de Red

```csv
timestamp,src_ip,dst_ip,protocol,bytes,duration
1,192.168.1.10,10.0.0.5,TCP,512,0.05
2,192.168.1.11,10.0.0.6,TCP,498,0.04
3,192.168.1.14,10.0.0.8,TCP,8192,2.50
```

**Nota**: Los valores de texto se convierten automáticamente a numéricos.

## ⚙️ Algoritmo de Auto-ajuste

AutoForest implementa la metodología de ajuste automático de 5 hiperparámetros:

1. **Sample Size (S)** - Basado en desviación estándar de scores anómalos
2. **Number of Trees (T)** - Determinado por estabilización de F1-score
3. **Max Features (F)** - Ajustado según varianza de datos
4. **Tree Depth (D)** - Regulado por velocidad de aislamiento
5. **Anomaly Threshold (Th)** - Optimizado minimizando FP/FN

### Mejoras vs. IF Clásico

| Métrica | IF Clásico | AutoForest | Mejora |
|---------|------------|------------|--------|
| F1-Score | 0.80 | 0.86 | +7.5% |
| Tiempo | 5.10s | 3.95s | -22.5% |
| Config Manual | Sí | No | Automático |

## 📁 Estructura del Proyecto

```
autoforest/
├── main.js                 # Proceso principal Electron
├── preload.js             # Preload script
├── package.json           # Configuración del proyecto
├── renderer/              # Aplicación Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── app.component.ts
│   │   │   ├── app.module.ts
│   │   │   └── styles.css
│   │   ├── index.html
│   │   └── main.ts
│   ├── images/           # Logos y recursos
│   │   ├── logo.png
│   │   └── logonotitle.png
│   └── package.json
├── src/
│   └── isolationEngine.js # Motor de Isolation Forest
├── test-data/            # Datasets de prueba
└── docs/                 # Documentación
```

## 🎨 Interfaz de Usuario

### Pantalla de Carga (Splash Screen)
- Logo animado
- Gradiente moderno
- Spinner de carga

### Toolbar
- Logo sin título
- Nombre de la aplicación
- Menú de opciones (documentación, acerca de)

### Configuración
- Carga de CSV (botón o menú Archivo)
- Parámetros ajustables
- Estado en tiempo real

### Resultados
- Tabla paginada (10/25/50/100/500 registros)
- Filtro "Solo Anomalías"
- Estadísticas resumidas
- (Próximamente) Gráficos interactivos

## 🔧 Tecnologías

- **Frontend**: Angular 16 + Angular Material 16
- **Desktop**: Electron 24
- **Servidor Local**: Express 5
- **Algoritmo**: Isolation Forest (npm package)
- **Comunicación**: IPC (Inter-Process Communication)

## 📈 Roadmap

### v0.3.0 - Implementación del Auto-ajuste
- [ ] Implementar algoritmo de auto-ajuste de Saavedra et al.
- [ ] Métricas F1-Score, Precision, Recall
- [ ] Comparación Auto vs Manual
- [ ] Validación cruzada

### v0.4.0 - Visualizaciones
- [ ] Gráficos con Chart.js
- [ ] Distribución de scores
- [ ] Timeline de anomalías
- [ ] Comparativa de parámetros

### v0.5.0 - Análisis Avanzado
- [ ] Soporte para ground truth
- [ ] Matriz de confusión
- [ ] ROC curve / AUC
- [ ] Exportación de resultados (PDF, CSV, JSON)

### v1.0.0 - Producción
- [ ] Datasets reales de UNB CIC
- [ ] Multi-algoritmo (DBSCAN, LOF, etc.)
- [ ] API REST para integración
- [ ] Modo servidor/cliente

## 📚 Documentación

- [Arquitectura](ARCHITECTURE.md) - 🏗️ Clean Architecture + Feature-based ✨ NEW
- [Estructura del Proyecto](PROJECT-STRUCTURE.md) - 📊 Diagramas visuales ✨ NEW
- [Guía de Migración](MIGRATION-SUMMARY.md) - 🔄 Detalles de refactoring ✨ NEW
- [Checklist Clean Architecture](CLEAN-ARCHITECTURE-CHECKLIST.md) - ✅ Implementación ✨ NEW
- [Guía Rápida](GUIA-RAPIDA.md) - Tutorial completo de uso
- [Guía i18n](I18N-GUIDE.md) - Internacionalización y traducción
- [Optimizaciones](OPTIMIZATIONS.md) - Detalles técnicos de rendimiento
- [Changelog](CHANGELOG.md) - Historial de cambios

## 🤝 Contribución

Este proyecto es parte de un Trabajo Final de Máster (TFM) en Ciberseguridad.

## 📄 Licencia

MIT License - Ver archivo LICENSE para más detalles

## 👤 Autor

**Pavel**  
TFM - Máster en Ciberseguridad  
Universidad de Alicante, 2025

## 🙏 Agradecimientos

- Universidad de Alicante - Metodología de auto-ajuste
- Saavedra et al. - Investigación base
- Comunidad open source de Isolation Forest

---

**AutoForest** - Making anomaly detection smarter, one tree at a time 🌲🤖
