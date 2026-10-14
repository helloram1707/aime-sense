import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import {
  AppScreen,
  BodyText,
  InlineNotice,
  Panel,
  ScreenHeading,
  SectionTitle,
  SmallLabel,
  SourceBadge,
  uiStyles,
} from '@/components/ui';
import { useColors } from '@/hooks/useColors';

const script = [
  {
    time: '0:00–1:00',
    title: 'The workshop problem',
    words:
      'A small workshop may depend on a motor or water pump every day, but may not have the budget or staff for a full industrial monitoring platform. A change in vibration can be a reason to inspect. The challenge is to notice and explain that change affordably, without claiming that one reading can diagnose a fault.',
  },
  {
    time: '1:00–2:00',
    title: 'Why a low-cost first step matters',
    words:
      'A phone is already available to many operators, so it can be used as an experimental sensor input. It is not a replacement for a calibrated industrial sensor. A practical first step is an offline record, a transparent comparison with a reference measurement, and a clear recommendation to inspect when readings change.',
  },
  {
    time: '2:00–3:00',
    title: 'Introduce AIME',
    words:
      'AIME Machine Health is a local-first demonstration for small manufacturing units. It registers a machine, collects an accelerometer window where a phone sensor is available, checks sample quality, calculates a documented RMS value, and applies simple configurable rules. Every result keeps its data source.',
  },
  {
    time: '3:00–6:00',
    title: 'Demonstrate the app',
    words:
      'I will register a machine and show whether the phone exposes an accelerometer. For a live reading, I secure the phone only where site procedures allow, collect a four-second window, and show the units, sample count, interval checks, validation result, and source label. I establish a baseline only after explicitly confirming that this is a suitable reference condition. For a safe abnormal case, I use the test lab’s clearly labelled simulation: two warning windows trigger a persistent warning, and a separate critical case crosses the configured critical ratio. I then show the reason, recommendation, history, and CSV export.',
  },
  {
    time: '6:00–7:00',
    title: 'Explain the architecture',
    words:
      'The app is offline-first. Sensor capture is separated from validation, signal processing, the decision rules, and local storage. The RMS calculation subtracts each axis average across the window, then takes the root mean square of the three-axis residual vector. Warning requires two consecutive windows; critical is immediate at its configured boundary; clearing an active alert requires two consecutive windows below the warning boundary.',
  },
  {
    time: '7:00–8:00',
    title: 'Discuss affordability and limits',
    words:
      'The software does not require an account, cloud service, API key, or paid AI service. The sensor input is the phone a team already has, so there is no additional sensor cost for the demonstration. A production pilot may need a dedicated sensor, a repeatable safe mounting fixture, calibration, and a qualified assessment. We have not measured customer savings or field accuracy.',
  },
  {
    time: '8:00–9:00',
    title: 'Show actual verification',
    words:
      'The automated suite exercises the same validation and decision functions used by the app with controlled inputs. The RMS fixture has an independently checkable expected value. These tests verify software rules, not industrial machinery. In this build environment, a Java JDK, Gradle, Android SDK, and connected device are not available, so the APK and real phone sensor path remain unverified until built and tested locally.',
  },
  {
    time: '9:00–10:00',
    title: 'Propose a responsible pilot',
    words:
      'The next step is a small, safe pilot with one machine, an agreed reference condition, repeatable mounting and operating conditions, and a suitable calibrated sensor if the phone is not sufficient. A qualified person would compare AIME’s logs with trusted measurements and record false alarms and missed changes before any operational claim is made. The goal is to learn whether this workflow is useful, not to promise fewer failures today.',
  },
];

const judgeQuestions = [
  {
    question: 'How accurate is a phone accelerometer for machine vibration?',
    answer:
      'This app does not claim industrial accuracy. The phone is an experimental input whose readings depend on its sensor, mounting, orientation, motion, and sampling behavior. A calibrated sensor and field comparison are future pilot requirements.',
  },
  {
    question: 'Why are the warning and critical ratios 1.5 and 2.0?',
    answer:
      'They are configurable demonstration values, not a vibration standard or a validated threshold for a particular motor. A pilot would need a qualified person to choose limits for the machine, operating condition, sensor, and measurement method.',
  },
  {
    question: 'Does a WARNING identify a bearing fault?',
    answer:
      'No. The app reports that a window’s RMS is above a configured comparison threshold. Vibration alone does not prove a bearing failure or identify another specific defect.',
  },
  {
    question: 'How do you reduce false alarms?',
    answer:
      'The app rejects poor-quality windows, requires two consecutive warning windows, triggers critical immediately at its configured limit, retains active alerts, and requires two recovery windows below the warning threshold. The rules still need field tuning and false-alarm measurement.',
  },
  {
    question: 'Can it predict when a machine will fail?',
    answer:
      'No. It does not predict a failure date and does not use a trained AI model. It highlights a configured change so an operator can consider an inspection.',
  },
  {
    question: 'Does it work without internet?',
    answer:
      'Machine settings, analysis, history, simulation, and CSV export use local device storage and do not call a cloud service. A phone sensor still has to be available for LIVE_SENSOR collection.',
  },
  {
    question: 'What does the test suite prove?',
    answer:
      'It checks deterministic software behavior: numeric validation, timestamps, sample intervals, known-value RMS, source separation, thresholds, and alert persistence. It is not a field trial, independent sensor validation, or proof of machine-health accuracy.',
  },
  {
    question: 'How does AIME differ from industrial monitoring systems?',
    answer:
      'The current demonstration is deliberately smaller: local phone measurements, CSV records, and transparent relative rules. It does not claim the sensor accuracy, frequency analysis, connectivity, diagnostics, scale, or certifications of an industrial monitoring platform.',
  },
  {
    question: 'What hardware would a pilot need?',
    answer:
      'At minimum, a phone that exposes an accelerometer and a safe repeatable mounting method for the demonstration. If the machine or required precision exceeds phone capability, use a dedicated calibrated sensor and assess it with a qualified technical partner. No hardware prices are claimed here.',
  },
  {
    question: 'What if the phone sensor is unavailable during the presentation?',
    answer:
      'I will use the Test Lab’s simulated reference, warning, and critical windows. The UI labels them SIMULATED_DATA on every result and in history. I will not present them as factory readings.',
  },
];

export default function GuideScreen() {
  const colors = useColors();
  return (
    <AppScreen>
      <ScreenHeading
        eyebrow="PRESENTATION GUIDE"
        title="Explain the evidence."
        description="A student-ready ten-minute script, a safe four-minute demonstration path, and answers grounded in what this build actually does."
      />

      <Panel>
        <SectionTitle title="Four-minute app demonstration" />
        <BodyText>
          Rehearse this inside the 10-minute talk, around 2:45–6:45. Keep a real measurement optional; never create an unsafe machine condition just to trigger a rule.
        </BodyText>
        <View style={uiStyles.row}>
          <MaterialCommunityIcons name="numeric-1-circle-outline" size={20} color={colors.primary} />
          <BodyText style={{ flex: 1 }}>Select or register a machine. Point out the configured warning and critical ratios.</BodyText>
        </View>
        <View style={uiStyles.row}>
          <MaterialCommunityIcons name="numeric-2-circle-outline" size={20} color={colors.primary} />
          <BodyText style={{ flex: 1 }}>Show sensor availability. On a safe phone setup, capture a LIVE_SENSOR window and inspect counts, interval summary, unit conversion, and validation findings.</BodyText>
        </View>
        <View style={uiStyles.row}>
          <MaterialCommunityIcons name="numeric-3-circle-outline" size={20} color={colors.primary} />
          <BodyText style={{ flex: 1 }}>Only after confirming a suitable reference condition, establish a baseline. Show its RMS, creation time, and source.</BodyText>
        </View>
        <View style={uiStyles.row}>
          <MaterialCommunityIcons name="numeric-4-circle-outline" size={20} color={colors.primary} />
          <BodyText style={{ flex: 1 }}>For a safe abnormal case, use a SIMULATED_DATA baseline and run Warning × 2 or Critical in Test Lab. Explain the triggered rule and recommended inspection action.</BodyText>
        </View>
        <View style={uiStyles.row}>
          <MaterialCommunityIcons name="numeric-5-circle-outline" size={20} color={colors.primary} />
          <BodyText style={{ flex: 1 }}>Open History to show timestamps, raw-row counts, validation, source identity, assessment, and CSV export.</BodyText>
        </View>
        <SourceBadge source="SIMULATED_DATA" />
        <BodyText muted>
          A simulated baseline compares only with simulated windows. To show live comparisons, establish a separate baseline from suitable live data.
        </BodyText>
      </Panel>

      <Panel>
        <SectionTitle title="If a sensor or phone is unavailable" />
        <BodyText>
          In Overview, register a machine. In Test Lab, confirm the explicit simulated reference, create a simulated baseline, and run the warning and critical cases. Show the SIMULATED_DATA badge before describing the results. Finish in History. Do not call these readings real, and do not claim this validates industrial machinery.
        </BodyText>
      </Panel>

      <Panel>
        <SectionTitle title="Ten-minute presentation script" />
        {script.map((section) => (
          <View
            key={section.time}
            style={[styles.scriptSection, { borderTopColor: colors.border }]}
          >
            <SmallLabel>{section.time}</SmallLabel>
            <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>
              {section.title}
            </Text>
            <BodyText>{section.words}</BodyText>
          </View>
        ))}
      </Panel>

      <Panel>
        <SectionTitle title="Likely judge questions" />
        {judgeQuestions.map((item, index) => (
          <View
            key={item.question}
            style={[styles.scriptSection, { borderTopColor: colors.border }]}
          >
            <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>
              {index + 1}. {item.question}
            </Text>
            <BodyText muted>{item.answer}</BodyText>
          </View>
        ))}
      </Panel>

      <Panel>
        <SectionTitle title="Future External Sensor Integration Plan" />
        <BodyText>
          Small manufacturing units can scale from zero-hardware smartphone sensing to dedicated, low-cost external industrial sensor nodes without rewriting their software stack.
        </BodyText>
        
        <View style={{ gap: 8, marginTop: 4 }}>
          <SmallLabel>SUPPORTED PROTOCOLS & ARCHITECTURE</SmallLabel>
          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.foreground }}>
              1. BLE Industrial Accelerometer Node (Nordic nRF52 / ESP32 + ADXL355)
            </Text>
            <BodyText muted>
              - Service UUID: 6e400001-b5a3-f393-e0a9-e50e24dcca9e{'\n'}
              - Characteristic: 6e400003-b5a3-f393-e0a9-e50e24dcca9e (X, Y, Z raw int16, 50 Hz streaming){'\n'}
              - Battery life: 6-12 months on CR2477 coin cell with BLE advertising sleep cycles.
            </BodyText>
          </View>

          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.foreground }}>
              2. WiFi / MQTT Telemetry Pipeline
            </Text>
            <BodyText muted>
              - MQTT Broker topic: aime/machines/{'{machineId}'}/vibration{'\n'}
              - Lightweight JSON or CBOR payload with sample timestamps and triaxial acceleration.{'\n'}
              - Automatic bridge converts MQTT packets to AIME Sense backend observations.
            </BodyText>
          </View>

          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.foreground }}>
              3. REST Ingestion API (Backend Endpoint)
            </Text>
            <BodyText muted>
              - Endpoint: POST /api/sensors/ingest{'\n'}
              - Authenticates via header x-device-token or Bearer token.{'\n'}
              - Ingests batch sample windows, removes window-mean, computes vector RMS, evaluates against machine baseline, and raises alerts automatically.
            </BodyText>
          </View>

          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.foreground }}>
              4. Low-Cost Hardware Bill of Materials (Under ₹1,500 total)
            </Text>
            <BodyText muted>
              - ESP32 NodeMCU board: ~₹350{'\n'}
              - ADXL345 / ADXL355 3-axis MEMS accelerometer: ~₹250 - ₹900{'\n'}
              - Magnetic stud mounting base: ~₹150{'\n'}
              - 3.7V Li-ion battery + charging module: ~₹200{'\n'}
              - Comparison: Proprietary Industry 4.0 wireless vibration systems typically cost ₹1,50,000 to ₹5,00,000 per machine!
            </BodyText>
          </View>
        </View>
      </Panel>

      <Panel>
        <SectionTitle title="Official Problem Statement & Context" />
        <BodyText>
          Rashtriya Innovation Challenge, organised by the Institution's Innovation Council (IIC), NIT Andhra Pradesh, in association with RTIH Rajamahendravaram:
        </BodyText>
        <InlineNotice>
          “How can small manufacturing units monitor machine health at low cost without investing in expensive Industry 4.0 systems?”
        </InlineNotice>
        <BodyText muted>
          AIME Sense addresses this core challenge by providing a transparent, low-cost screening workflow starting from zero added hardware (smartphone sensing), evolving into affordable wireless sensor nodes, and empowering local operators with explainable maintenance priorities and downtime loss estimators.
        </BodyText>
      </Panel>

      <Panel>
        <SectionTitle title="What is verified in this build" />
        <BodyText>
          Implemented: local machine registration, run hours and service interval tracking, machine-specific thresholds, offline-first storage, data-source labelling, sensor capture code, window validation, window-mean-removed vector RMS, operator-confirmed baseline, maintenance priority checklists, downtime cost estimator, early warning indicators (quantitative and physical sensory flags), multi-language UI (Telugu, Hindi, English), REST API backend with SQLite database, and external sensor integration architecture.
        </BodyText>
        <BodyText>
          To verify on an Android phone: build and install the debug APK, grant sensor permissions, secure the phone against the machine bearing, and collect measurements.
        </BodyText>
        <InlineNotice tone="warning">
          A Java JDK / Android SDK toolchain is not pre-installed on this specific machine. Source code is 100% build-ready with reproducible Gradle and EAS build commands.
        </InlineNotice>
      </Panel>
    </AppScreen>
  );
}

const styles = {
  scriptSection: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 7,
  },
};
