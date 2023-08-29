import React from 'react';
import { StyleSheet, View, Button, ScrollView, StatusBar, Pressable, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';

import Fade from 'react-native-fade';

import formatCoursName from '../utils/FormatCoursName';
import getClosestGradeEmoji from '../utils/EmojiCoursName';
import getClosestColor from '../utils/ColorCoursName';

import { Text, useTheme } from 'react-native-paper';
import { useEffect, useState } from 'react';
import { PressableScale } from 'react-native-pressable-scale';

import { useActionSheet } from '@expo/react-native-action-sheet';
import { getUser } from '../fetch/PronoteData/PronoteUser';

import { getEvaluations, changePeriod } from '../fetch/PronoteData/PronoteGrades';
import { set } from 'react-native-reanimated';

function EvaluationsScreen({ navigation }) {
  const theme = useTheme();
  const { showActionSheetWithOptions } = useActionSheet();

  const [evaluations, setEvaluations] = useState([]);

  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [periodsList, setPeriodsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [refreshCount, setRefreshCount] = useState(0);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (isLoading ? <ActivityIndicator /> : null),
      headerRight: () => (
        <Fade visible={selectedPeriod} direction="up" duration={200}>
          <TouchableOpacity onPress={newPeriod} style={styles.periodButtonContainer}>
            <Text style={styles.periodButtonText}>{selectedPeriod?.name || ""}</Text>
          </TouchableOpacity>
        </Fade>
      ),
    });
  }, [navigation, selectedPeriod, isLoading]);

  function newPeriod() {
    const options = periodsList.map(period => period.name);
    options.push("Annuler");

    showActionSheetWithOptions(
      {
        title: "Changer de période",
        message: "Sélectionnez la période de votre choix",
        options,
        cancelButtonIndex: options.length - 1,
      },
      selectedIndex => {
        if (selectedIndex === options.length - 1) return;
        const selectedPeriod = periodsList[selectedIndex];
        setSelectedPeriod(selectedPeriod);
        changePeriodPronote(selectedPeriod);
      }
    );
  }

  async function changePeriodPronote(period) {
    setIsLoading(true);
    await changePeriod(period.name);
    getUser(true);
    setRefreshCount(refreshCount + 1);
    setIsLoading(false);
  }

  async function getPeriods() {
    const result = await getUser(false);
    const userData = result;
    const allPeriods = userData.periods;

    const actualPeriod = allPeriods.find(period => period.actual === true);
    let periods = [];

    if (actualPeriod.name.toLowerCase().includes("trimestre")) {
      periods = allPeriods.filter(period => period.name.toLowerCase().includes("trimestre"));
    } else if (actualPeriod.name.toLowerCase().includes("semestre")) {
      periods = allPeriods.filter(period => period.name.toLowerCase().includes("semestre"));
    }

    setPeriodsList(periods);
    setSelectedPeriod(actualPeriod);
  }

  React.useEffect(() => {
    if (periodsList.length === 0) {
      getPeriods();
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    getEvaluations().then((evaluations) => {
      setIsLoading(false);
      let evals = JSON.parse(evaluations);
      
      let finalEvals = [];

      // for each eval, sort by subject
      evals.forEach((item) => {
        let subject = item.subject;
        let subjectEvals = finalEvals.find((subjectEval) => subjectEval.subject.name == subject.name);

        if (subjectEvals) {
          subjectEvals.evals.push(item);
        }
        else {
          finalEvals.push({
            subject : subject,
            evals : [item]
          });
        }
      });

      console.log(finalEvals);
      setEvaluations(finalEvals);
    });
  }, [refreshCount]);

  const [isHeadLoading, setIsHeadLoading] = useState(false);

  const onRefresh = React.useCallback(() => {
    setIsHeadLoading(true);
    setRefreshCount(refreshCount + 1);
    setIsHeadLoading(false);
  }, []);

  return (
    <ScrollView style={styles.container} contentInsetAdjustmentBehavior='automatic'
    refreshControl={
      <RefreshControl refreshing={isHeadLoading} onRefresh={onRefresh} />
    }>
      <StatusBar animated barStyle={'light-content'} />
      
      { evaluations.length > 0 ?
        evaluations.map((subject, index) => {
          return (
            <View key={index} style={[styles.subjectContainer, {backgroundColor: theme.dark ? '#151515' : '#fff'}]}>
              <Pressable style={[styles.subjectNameContainer]}>
                <Text style={[styles.subjectName]}>{formatCoursName(subject.subject.name)}</Text>
                <Text>{JSON.stringify}</Text>
              </Pressable>
              <View style={[styles.competencesList]}>
                { subject.evals.map((evaluation, index) => {
                  return (
                    <View key={index} style={[styles.competenceContainer, {borderColor: theme.dark ? '#ffffff20' : '#00000015', borderBottomWidth: index != subject.evals.length - 1 ? 1 : 0}]}>
                      <PressableScale style={[styles.competence]}>
                        <View style={styles.competenceEmojiContainer}>
                          <Text style={[styles.competenceEmoji]}>{getClosestGradeEmoji(evaluation.subject.name)}</Text>
                        </View>
                        <View style={styles.competenceNameContainer}>
                          <Text style={[styles.competenceName]}>{formatCoursName(evaluation.name)}</Text>
                          <Text style={[styles.competenceDate]}>{new Date(evaluation.date).toLocaleDateString('fr', {weekday: 'long', day: '2-digit', month: 'short'})}</Text>
                        </View>
                        <View style={styles.competenceGradeContainer}>
                          { evaluation.acquisitions.map((acquisition, index) => {
                            const abbreviationColors = {
                              'A' : '#1C7B64',
                              'A+' : '#1C7B64',
                              'B' : '#29947A',
                              'C' : '#A84700',
                              'D' : '#B42828',
                              '1' : '#1C7B64',
                              '2' : '#29947A',
                              '3' : '#A84700',
                              '4' : '#B42828',
                            }

                            let text = acquisition.abbreviation;
                            if(acquisition.abbreviation == 'A+') text = '+';
                            
                            return (
                              <View style={[styles.competenceGrade, {backgroundColor: abbreviationColors[acquisition.abbreviation]}]} key={index}>
                                <Text style={styles.competenceGradeText}>{text}</Text>
                              </View>
                            )
                          })}
                        </View>
                      </PressableScale>
                    </View>
                  )
                })}
              </View>
            </View>
          )
        })
      : null }
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  subjectContainer: {
    marginTop: 14,
    marginHorizontal: 14,
    borderRadius: 12,
    borderCurve: 'continuous',
    overflow: 'hidden'
  },

  subjectNameContainer: {
    padding: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#29947A'
  },
  subjectName: {
    fontSize: 16,
    fontFamily: 'Papillon-Semibold',
    color: '#fff'
  },

  competencesList: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start'
  },

  competenceContainer: {
    padding: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },

  periodButtonText: {
    fontSize: 17,
    marginTop: -1,
    color: '#21826A',
  },

  competence: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    height: '100%',
    gap: 16,
  },

  competenceNameContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    flex: 1
  },

  competenceName: {
    fontSize: 16,
    fontFamily: 'Papillon-Semibold',
  },
  competenceDate: {
    fontSize: 15,
    marginTop: 2,
    opacity: 0.5,
  },

  competenceEmojiContainer: {
  },
  competenceEmoji: {
    fontSize: 24,
  },

  competenceGradeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  competenceGrade: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#ffffff20',
    borderWidth: 1,
  },
  competenceGradeText: {
    fontSize: 15,
    fontFamily: 'Papillon-Medium',
    color: '#fff',
    marginLeft: 1,
    opacity: 0.7,
  }
});

export default EvaluationsScreen;