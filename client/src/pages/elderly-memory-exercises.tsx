import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Brain, CheckCircle, XCircle, RefreshCw, Trophy, Clock, Target } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

type ExerciseType = "words" | "numbers" | "sequences" | "pairs" | "stories" | "pairs-cards";
type Difficulty = "easy" | "medium" | "hard";

interface Exercise {
  type: ExerciseType;
  difficulty: Difficulty;
  prompt: string;
  options?: string[];
  correctAnswer: string | string[];
  userAnswer?: string | string[];
  timeLimit?: number;
  points: number;
}

export default function ElderlyMemoryExercises() {
  const { user } = useAuth();
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("easy");
  const [exercisePhase, setExercisePhase] = useState<"menu" | "memorize" | "recall" | "result">("menu");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [sequenceOrder, setSequenceOrder] = useState<string[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number[]>([]);
  const [cardGrid, setCardGrid] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);

  // Obtener datos biográficos del usuario para personalizar
  const userPreferences = user?.preferences ? JSON.parse(JSON.stringify(user.preferences)) : {};
  const userTraits = user?.personalityTraits ? JSON.parse(JSON.stringify(user.personalityTraits)) : {};
  const hobbies = userPreferences.hobbies || ["leer", "caminar", "cocinar"];
  const likes = userPreferences.likes || ["familia", "naturaleza", "música"];
  const familyName = user?.emergencyContactName || "un familiar";

  // Timer para ejercicios con límite de tiempo
  useEffect(() => {
    if (timeRemaining > 0 && exercisePhase === "recall") {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && exercisePhase === "recall") {
      handleSubmitAnswer();
    }
  }, [timeRemaining, exercisePhase]);

  const generateWordsExercise = (difficulty: Difficulty): Exercise => {
    const personalWords = [
      ...hobbies.map((h: string) => h.toUpperCase()),
      ...likes.map((l: string) => l.toUpperCase()),
      user?.firstName?.toUpperCase() || "NOMBRE",
    ];

    const commonWords = ["CASA", "ÁRBOL", "COCHE", "FLOR", "MESA", "LIBRO", "SOL", "MAR", "ARENA"];
    const allWords = [...personalWords, ...commonWords];
    
    const wordCount = difficulty === "easy" ? 4 : difficulty === "medium" ? 6 : 9;
    const selectedWords = allWords.sort(() => 0.5 - Math.random()).slice(0, wordCount);
    const distractors = allWords.filter(w => !selectedWords.includes(w)).slice(0, wordCount * 2);
    
    return {
      type: "words",
      difficulty,
      prompt: `Memoriza estas ${wordCount} palabras importantes:`,
      options: [...selectedWords, ...distractors].sort(() => 0.5 - Math.random()),
      correctAnswer: selectedWords,
      timeLimit: difficulty === "easy" ? 60 : difficulty === "medium" ? 45 : 30,
      points: difficulty === "easy" ? 10 : difficulty === "medium" ? 20 : 30
    };
  };

  const generateNumbersExercise = (difficulty: Difficulty): Exercise => {
    const length = difficulty === "easy" ? 4 : difficulty === "medium" ? 7 : 10;
    const numbers = Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
    
    return {
      type: "numbers",
      difficulty,
      prompt: `Memoriza esta secuencia de números:`,
      correctAnswer: numbers,
      timeLimit: difficulty === "easy" ? 30 : difficulty === "medium" ? 20 : 15,
      points: difficulty === "easy" ? 15 : difficulty === "medium" ? 25 : 35
    };
  };

  const generateSequenceExercise = (difficulty: Difficulty): Exercise => {
    const items = ["🍎", "🍊", "🍌", "🍇", "🍓", "🥝", "🍑", "🍉", "🥥", "🍅"];
    const length = difficulty === "easy" ? 4 : difficulty === "medium" ? 6 : 8;
    const sequence = items.sort(() => 0.5 - Math.random()).slice(0, length);
    
    return {
      type: "sequences",
      difficulty,
      prompt: `Memoriza el orden de estas frutas:`,
      options: items.slice(0, length + 3),
      correctAnswer: sequence,
      timeLimit: difficulty === "easy" ? 40 : difficulty === "medium" ? 30 : 20,
      points: difficulty === "easy" ? 20 : difficulty === "medium" ? 30 : 40
    };
  };

  const generatePairsExercise = (difficulty: Difficulty): Exercise => {
    const pairs = [
      [`${user?.firstName || "María"}`, familyName],
      [hobbies[0], "mañana"],
      [likes[0], "favorito"],
      ["Medicina", "9:00"],
      ["Cita", "Martes"],
      ["Ejercicio", "Tarde"]
    ];
    
    const numPairs = difficulty === "easy" ? 3 : difficulty === "medium" ? 5 : 7;
    const selectedPairs = pairs.slice(0, numPairs);
    const pairString = selectedPairs.map(p => `${p[0]} - ${p[1]}`).join(", ");
    
    return {
      type: "pairs",
      difficulty,
      prompt: `Memoriza estas asociaciones:`,
      correctAnswer: pairString,
      timeLimit: difficulty === "easy" ? 60 : difficulty === "medium" ? 45 : 30,
      points: difficulty === "easy" ? 25 : difficulty === "medium" ? 35 : 45
    };
  };

  const generateStoryExercise = (difficulty: Difficulty): Exercise => {
    const storyVariations = {
      easy: [
        { story: `${user?.firstName || "María"} fue al parque y vio 2 pájaros cantando.`, question: "¿Cuántos pájaros vio?", answer: "2" },
        { story: `${user?.firstName || "María"} compró 3 manzanas en el mercado.`, question: "¿Cuántas manzanas compró?", answer: "3" },
        { story: `${user?.firstName || "María"} leyó 1 libro en la biblioteca.`, question: "¿Cuántos libros leyó?", answer: "1" },
        { story: `${user?.firstName || "María"} vio 4 gatos en el jardín.`, question: "¿Cuántos gatos vio?", answer: "4" },
      ],
      medium: [
        { story: `${user?.firstName || "María"} estaba ${hobbies[0]} cuando ${familyName} llamó a las 3 de la tarde para invitarle a comer.`, question: "¿A qué hora llamó?", answer: "3" },
        { story: `${user?.firstName || "María"} quedó con ${familyName} a las 5 de la tarde en el café.`, question: "¿A qué hora quedaron?", answer: "5" },
        { story: `Ayer ${user?.firstName || "María"} fue al médico a las 10 de la mañana.`, question: "¿A qué hora fue al médico?", answer: "10" },
        { story: `${user?.firstName || "María"} tomó la medicina a las 2 de la tarde como le dijo el doctor.`, question: "¿A qué hora tomó la medicina?", answer: "2" },
      ],
      hard: [
        { story: `El martes pasado, ${user?.firstName || "María"} preparó ${likes[0] === "cocina" ? "una paella" : "la comida"} para 5 personas, incluyendo a ${familyName} y sus 2 vecinos del tercero.`, question: "¿Para cuántas personas preparó comida?", answer: "5" },
        { story: `${user?.firstName || "María"} organizó una cena para 8 invitados, incluyendo a ${familyName}, 3 vecinos y 4 amigos del trabajo.`, question: "¿Cuántos invitados había en total?", answer: "8" },
        { story: `En la farmacia, ${user?.firstName || "María"} compró 6 medicamentos diferentes: uno para la presión, dos vitaminas y tres para el dolor.`, question: "¿Cuántos medicamentos compró en total?", answer: "6" },
        { story: `${user?.firstName || "María"} fue de compras y gastó 7 euros en pan, 12 euros en fruta y 6 euros en leche, pagando 25 euros en total.`, question: "¿Cuántos euros pagó en total?", answer: "25" },
      ]
    };
    
    const variations = storyVariations[difficulty];
    const randomIndex = Math.floor(Math.random() * variations.length);
    const selectedStory = variations[randomIndex];
    
    return {
      type: "stories",
      difficulty,
      prompt: selectedStory.story,
      correctAnswer: selectedStory.answer,
      timeLimit: difficulty === "easy" ? 90 : difficulty === "medium" ? 60 : 45,
      points: difficulty === "easy" ? 30 : difficulty === "medium" ? 40 : 50
    };
  };

  const generatePairsCardsExercise = (difficulty: Difficulty): Exercise => {
    const cardEmojis = ["🍎", "🌸", "🐱", "🏠", "⭐", "🎵", "🌞", "🌊", "🌳", "🦋", "🌺", "🎈"];
    const pairCount = difficulty === "easy" ? 3 : difficulty === "medium" ? 4 : 6;
    
    // Seleccionar emojis para este juego
    const selectedEmojis = cardEmojis.slice(0, pairCount);
    
    // Crear pares y mezclar
    const cards = [...selectedEmojis, ...selectedEmojis].sort(() => Math.random() - 0.5);
    
    return {
      type: "pairs-cards",
      difficulty,
      prompt: `Encuentra las ${pairCount} parejas de cartas:`,
      correctAnswer: pairCount.toString(),
      timeLimit: difficulty === "easy" ? 120 : difficulty === "medium" ? 90 : 60,
      points: difficulty === "easy" ? 25 : difficulty === "medium" ? 35 : 50,
      options: cards
    };
  };

  const startExercise = (type: ExerciseType) => {
    let exercise: Exercise;
    
    switch (type) {
      case "words":
        exercise = generateWordsExercise(selectedDifficulty);
        break;
      case "numbers":
        exercise = generateNumbersExercise(selectedDifficulty);
        break;
      case "sequences":
        exercise = generateSequenceExercise(selectedDifficulty);
        break;
      case "pairs":
        exercise = generatePairsExercise(selectedDifficulty);
        break;
      case "stories":
        exercise = generateStoryExercise(selectedDifficulty);
        break;
      case "pairs-cards":
        exercise = generatePairsCardsExercise(selectedDifficulty);
        break;
      default:
        exercise = generateWordsExercise(selectedDifficulty);
    }
    
    setCurrentExercise(exercise);
    setExercisePhase("memorize");
    setUserInput("");
    setSelectedOptions([]);
    setSequenceOrder([]);
    setFlippedCards([]);
    setMatchedPairs([]);
    setAttempts(0);
    setShowResult(false);
    
    // Para el ejercicio de emparejar cartas, configurar la grilla
    if (exercise.type === "pairs-cards" && exercise.options) {
      setCardGrid(exercise.options);
    }
    
    // Tiempo de memorización basado en dificultad y tipo de ejercicio
    let memorizeTime = selectedDifficulty === "easy" ? 12000 : selectedDifficulty === "medium" ? 8000 : 5000;
    if (exercise.type === "stories" || exercise.type === "pairs") {
      memorizeTime += 3000;
    }
    
    setTimeout(() => {
      setExercisePhase("recall");
      setTimeRemaining(exercise.timeLimit || 60);
    }, memorizeTime);
  };

  const handleOptionToggle = (option: string) => {
    if (currentExercise?.type === "sequences") {
      // Para secuencias, registrar el orden
      if (sequenceOrder.includes(option)) {
        setSequenceOrder(sequenceOrder.filter(o => o !== option));
      } else {
        setSequenceOrder([...sequenceOrder, option]);
      }
    } else {
      // Para palabras, solo toggle
      if (selectedOptions.includes(option)) {
        setSelectedOptions(selectedOptions.filter(o => o !== option));
      } else {
        setSelectedOptions([...selectedOptions, option]);
      }
    }
  };

  const handleCardClick = (cardIndex: number) => {
    if (currentExercise?.type !== "pairs-cards") return;
    if (flippedCards.includes(cardIndex) || matchedPairs.includes(cardIndex)) return;
    if (flippedCards.length >= 2) return;

    const newFlippedCards = [...flippedCards, cardIndex];
    setFlippedCards(newFlippedCards);

    if (newFlippedCards.length === 2) {
      setAttempts(attempts + 1);
      
      // Verificar si las cartas coinciden
      const [first, second] = newFlippedCards;
      const firstCard = cardGrid[first];
      const secondCard = cardGrid[second];
      
      if (firstCard === secondCard) {
        // ¡Coincidencia!
        setTimeout(() => {
          const newMatchedPairs = [...matchedPairs, first, second];
          setMatchedPairs(newMatchedPairs);
          setFlippedCards([]);
          
          // Verificar si se completó el juego
          const pairCount = parseInt(currentExercise.correctAnswer as string);
          const newMatchedPairsCount = newMatchedPairs.length;
          if (newMatchedPairsCount >= pairCount * 2) {
            setTimeout(() => {
              handleSubmitAnswer(newMatchedPairs);
            }, 500);
          }
        }, 1000);
      } else {
        // No coinciden, voltear de vuelta después de un momento
        setTimeout(() => {
          setFlippedCards([]);
        }, 1500);
      }
    }
  };

  const handleSubmitAnswer = async (overrideMatchedPairs?: number[]) => {
    if (!currentExercise) return;
    
    let isCorrect = false;
    let userAnswer: string | string[] = "";
    
    if (currentExercise.type === "words") {
      userAnswer = selectedOptions;
      const correct = currentExercise.correctAnswer as string[];
      isCorrect = selectedOptions.length === correct.length && 
                  selectedOptions.every(opt => correct.includes(opt));
    } else if (currentExercise.type === "sequences") {
      userAnswer = sequenceOrder;
      const correct = currentExercise.correctAnswer as string[];
      isCorrect = sequenceOrder.length === correct.length && 
                  sequenceOrder.every((opt, idx) => opt === correct[idx]);
    } else if (currentExercise.type === "numbers") {
      // Para números, comparar solo dígitos sin espacios
      userAnswer = userInput.replace(/\D/g, "");
      const correctNumbers = (currentExercise.correctAnswer as string).replace(/\D/g, "");
      isCorrect = userAnswer === correctNumbers;
    } else if (currentExercise.type === "stories") {
      // Para historias, extraer el número de la respuesta
      userAnswer = userInput.replace(/\D/g, "");
      const correctAnswer = (currentExercise.correctAnswer as string).replace(/\D/g, "");
      isCorrect = userAnswer === correctAnswer;
    } else if (currentExercise.type === "pairs-cards") {
      // Para emparejar cartas, verificar si se completaron todas las parejas
      const pairCount = parseInt(currentExercise.correctAnswer as string);
      const currentMatchedPairs = overrideMatchedPairs || matchedPairs;
      const foundPairs = currentMatchedPairs.length / 2;
      userAnswer = `${foundPairs} parejas encontradas en ${attempts} intentos`;
      // El juego es correcto si se encontraron todas las parejas esperadas
      isCorrect = foundPairs >= pairCount;
    } else {
      userAnswer = userInput.trim();
      isCorrect = userAnswer.toLowerCase() === (currentExercise.correctAnswer as string).toLowerCase();
    }
    
    if (isCorrect) {
      setScore(score + currentExercise.points);
      setStreak(streak + 1);
      
      // Aumentar dificultad automáticamente después de 3 aciertos seguidos
      if ((streak + 1) % 3 === 0) {
        if (selectedDifficulty === "easy") setSelectedDifficulty("medium");
        else if (selectedDifficulty === "medium") setSelectedDifficulty("hard");
      }
    } else {
      setStreak(0);
    }

    // Registrar la actividad de ejercicio de memoria en la base de datos
    try {
      if (user?.id) {
        const exerciseTypeMap = {
          words: "Palabras",
          numbers: "Números", 
          sequences: "Secuencias",
          pairs: "Asociaciones",
          stories: "Historias",
          "pairs-cards": "Emparejar Cartas"
        };

        const activityData = {
          userId: user.id,
          activityType: "cognitive_exercise",
          description: `Ejercicio de memoria completado: ${exerciseTypeMap[currentExercise.type]} - ${selectedDifficulty} - ${isCorrect ? 'Correcto' : 'Incorrecto'} - ${currentExercise.points} puntos`,
          metadata: {
            exerciseType: currentExercise.type,
            difficulty: selectedDifficulty,
            correct: isCorrect,
            points: currentExercise.points,
            userAnswer: Array.isArray(userAnswer) ? userAnswer.join(", ") : userAnswer,
            correctAnswer: Array.isArray(currentExercise.correctAnswer) ? currentExercise.correctAnswer.join(", ") : currentExercise.correctAnswer,
            streak: isCorrect ? streak + 1 : 0
          }
        };

        console.log("Enviando datos del ejercicio de memoria:", activityData);

        const response = await fetch("/api/activities", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(activityData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error registrando actividad de memoria:", response.status, response.statusText, errorText);
        } else {
          const result = await response.json();
          console.log("Ejercicio de memoria registrado exitosamente:", result);
        }
      }
    } catch (error) {
      console.error("Error al registrar ejercicio de memoria:", error);
    }
    
    setCurrentExercise({ ...currentExercise, userAnswer });
    setExercisePhase("result");
    setShowResult(true);
  };

  const getDifficultyColor = (diff: Difficulty) => {
    switch (diff) {
      case "easy": return "bg-green-100 text-green-800 hover:bg-green-200";
      case "medium": return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "hard": return "bg-red-100 text-red-800 hover:bg-red-200";
    }
  };

  const renderMemorizePhase = () => {
    if (!currentExercise) return null;
    
    return (
      <div className="text-center space-y-6">
        <h2 className="responsive-text-3xl font-bold text-primary">¡Memoriza con atención!</h2>
        <div className="p-8 bg-blue-50 rounded-2xl">
          <p className="responsive-text-2xl mb-4 text-gray-700">{currentExercise.prompt}</p>
          
          {currentExercise.type === "words" && (
            <div className="flex flex-wrap justify-center gap-4">
              {(currentExercise.correctAnswer as string[]).map((word, idx) => (
                <div key={idx} className="px-6 py-3 bg-white rounded-xl shadow-md">
                  <span className="responsive-text-3xl font-bold text-primary">{word}</span>
                </div>
              ))}
            </div>
          )}
          
          {currentExercise.type === "numbers" && (
            <div className="elderly-text font-bold text-primary" style={{fontSize: 'var(--elderly-large-font-size)'}}>
              {currentExercise.correctAnswer}
            </div>
          )}
          
          {currentExercise.type === "sequences" && (
            <div className="flex justify-center gap-4">
              {(currentExercise.correctAnswer as string[]).map((item, idx) => (
                <div key={idx} className="elderly-text" style={{fontSize: 'var(--elderly-large-font-size)'}}>
                  {item}
                </div>
              ))}
            </div>
          )}
          
          {currentExercise.type === "pairs" && (
            <div className="responsive-text-3xl font-semibold text-primary">
              {currentExercise.correctAnswer}
            </div>
          )}
          
          {currentExercise.type === "stories" && (
            <div className="responsive-text-2xl text-gray-800 leading-relaxed">
              {currentExercise.prompt}
            </div>
          )}

          {currentExercise.type === "pairs-cards" && (
            <div className="space-y-4">
              <div className="responsive-text-2xl text-gray-800">
                {currentExercise.prompt}
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-4 justify-center">
                {cardGrid.map((card, idx) => (
                  <div key={idx} className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-xl shadow-md flex items-center justify-center">
                    <span className="text-4xl">{card}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-center gap-2">
          <Clock className="animate-spin text-primary" size={24} />
          <span className="responsive-text-xl text-gray-600">Memorizando...</span>
        </div>
      </div>
    );
  };

  const renderRecallPhase = () => {
    if (!currentExercise) return null;
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="responsive-text-3xl font-bold text-primary">¡Hora de recordar!</h2>
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-lg">
            <Clock size={24} className="text-orange-600" />
            <span className="responsive-text-xl font-bold text-orange-600">{timeRemaining}s</span>
          </div>
        </div>
        
        {(currentExercise.type === "words" || currentExercise.type === "sequences") && currentExercise.options && (
          <div>
            <p className="responsive-text-xl mb-4">
              {currentExercise.type === "words" 
                ? "Selecciona TODAS las palabras que memorizaste:" 
                : "Selecciona las frutas EN EL ORDEN EXACTO que las viste:"}
            </p>
            <div className="grid grid-cols-3 gap-4">
              {currentExercise.options.map((option, idx) => (
                <Button
                  key={idx}
                  onClick={() => handleOptionToggle(option)}
                  className={`responsive-text-xl py-6 ${
                    currentExercise.type === "sequences"
                      ? (sequenceOrder.includes(option) 
                          ? `bg-primary text-white` 
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200")
                      : (selectedOptions.includes(option) 
                          ? "bg-primary text-white" 
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200")
                  }`}
                  data-testid={`option-${idx}`}
                >
                  {currentExercise.type === "sequences" && sequenceOrder.includes(option) && (
                    <span className="absolute top-2 right-2 bg-white text-primary rounded-full w-8 h-8 flex items-center justify-center font-bold">
                      {sequenceOrder.indexOf(option) + 1}
                    </span>
                  )}
                  {option}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {(currentExercise.type === "numbers" || currentExercise.type === "pairs") && (
          <div>
            <p className="responsive-text-xl mb-4">
              {currentExercise.type === "numbers" ? "Escribe la secuencia de números:" : "Escribe las asociaciones:"}
            </p>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="w-full px-6 py-4 elderly-text border-2 border-gray-300 rounded-xl focus:border-primary"
              placeholder={currentExercise.type === "numbers" ? "Escribe los números sin espacios" : "Ej: Palabra1 - Palabra2"}
              data-testid="input-answer"
            />
          </div>
        )}
        
        {currentExercise.type === "stories" && (
          <div>
            <p className="responsive-text-xl mb-2 font-semibold">Pregunta:</p>
            <p className="responsive-text-2xl mb-4 text-primary">
              {currentExercise.difficulty === "easy" ? "¿Cuántos pájaros vio?" :
               currentExercise.difficulty === "medium" ? "¿A qué hora llamó?" :
               "¿Para cuántas personas preparó comida?"}
            </p>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="w-full px-6 py-4 elderly-text border-2 border-gray-300 rounded-xl focus:border-primary"
              placeholder="Tu respuesta"
              data-testid="input-story-answer"
            />
          </div>
        )}

        {currentExercise.type === "pairs-cards" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="responsive-text-xl">
                Haz clic en las cartas para emparejarlas:
              </p>
              <div className="text-right">
                <p className="responsive-text text-gray-600">Parejas encontradas: {matchedPairs.length / 2}</p>
                <p className="responsive-text text-gray-600">Intentos: {attempts}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4 justify-center">
              {cardGrid.map((card, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCardClick(idx)}
                  className={`w-20 h-20 md:w-24 md:h-24 rounded-xl shadow-md flex items-center justify-center transition-all duration-300 ${
                    flippedCards.includes(idx) || matchedPairs.includes(idx)
                      ? "bg-white border-2 border-primary"
                      : "bg-gradient-to-br from-blue-400 to-purple-500 hover:from-blue-500 hover:to-purple-600"
                  } ${matchedPairs.includes(idx) ? "opacity-60" : ""}`}
                  disabled={matchedPairs.includes(idx)}
                  data-testid={`card-${idx}`}
                >
                  {(flippedCards.includes(idx) || matchedPairs.includes(idx)) ? (
                    <span className="text-3xl md:text-4xl">{card}</span>
                  ) : (
                    <span className="text-white font-bold text-lg">?</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {currentExercise.type !== "pairs-cards" && (
          <Button
            onClick={handleSubmitAnswer}
            className="w-full py-6 elderly-button bg-green-600 hover:bg-green-700 text-white"
            data-testid="button-submit-answer"
          >
            Comprobar Respuesta
          </Button>
        )}
      </div>
    );
  };

  const renderResultPhase = () => {
    if (!currentExercise) return null;
    
    const isCorrect = () => {
      if (currentExercise.type === "words") {
        const correct = currentExercise.correctAnswer as string[];
        const user = currentExercise.userAnswer as string[];
        return user && user.length === correct.length && user.every(opt => correct.includes(opt));
      } else if (currentExercise.type === "sequences") {
        const correct = currentExercise.correctAnswer as string[];
        const user = currentExercise.userAnswer as string[];
        return user && user.length === correct.length && user.every((opt, idx) => opt === correct[idx]);
      } else if (currentExercise.type === "numbers" || currentExercise.type === "stories") {
        const userClean = currentExercise.userAnswer?.toString().replace(/\D/g, "");
        const correctClean = currentExercise.correctAnswer.toString().replace(/\D/g, "");
        return userClean === correctClean;
      } else if (currentExercise.type === "pairs-cards") {
        const pairCount = parseInt(currentExercise.correctAnswer as string);
        const foundPairs = matchedPairs.length / 2;
        return foundPairs >= pairCount;
      } else {
        return currentExercise.userAnswer?.toString().toLowerCase() === 
               currentExercise.correctAnswer.toString().toLowerCase();
      }
    };
    
    const correct = isCorrect();
    
    return (
      <div className="space-y-6">
        <div className={`p-8 rounded-2xl text-center ${correct ? "bg-green-50" : "bg-red-50"}`}>
          <div className="mb-4">
            {correct ? (
              <CheckCircle size={64} className="text-green-600 mx-auto" />
            ) : (
              <XCircle size={64} className="text-red-600 mx-auto" />
            )}
          </div>
          
          <h2 className={`responsive-text-3xl font-bold mb-2 ${correct ? "text-green-800" : "text-red-800"}`}>
            {correct ? "¡Excelente!" : "¡Sigue intentando!"}
          </h2>
          
          <p className="responsive-text-xl text-gray-700 mb-4">
            {correct ? `Has ganado ${currentExercise.points} puntos` : "No pasa nada, la práctica hace al maestro"}
          </p>
          
          {!correct && currentExercise.type !== "pairs-cards" && (
            <div className="mt-4 p-4 bg-white rounded-xl">
              <p className="responsive-text-lg text-gray-600">Respuesta correcta:</p>
              <p className="responsive-text-xl font-bold text-primary">
                {Array.isArray(currentExercise.correctAnswer) 
                  ? currentExercise.correctAnswer.join(", ")
                  : currentExercise.correctAnswer}
              </p>
            </div>
          )}
          
          {!correct && currentExercise.type === "pairs-cards" && (
            <div className="mt-4 p-4 bg-white rounded-xl">
              <p className="responsive-text-lg text-gray-600">
                Se agotó el tiempo. Encontraste {matchedPairs.length / 2} de {parseInt(currentExercise.correctAnswer as string)} parejas.
              </p>
            </div>
          )}
        </div>
        
        <div className="flex gap-4">
          <Button
            onClick={() => setExercisePhase("menu")}
            className="flex-1 py-4 elderly-button bg-gray-600 hover:bg-gray-700 text-white"
            data-testid="button-back-menu"
          >
            Volver al Menú
          </Button>
          <Button
            onClick={() => startExercise(currentExercise.type)}
            className="flex-1 py-4 responsive-text-xl bg-primary hover:bg-primary/90 text-white"
            data-testid="button-try-again"
          >
            <RefreshCw size={24} className="mr-2" />
            Intentar de Nuevo
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 p-4" data-testid="page-memory-exercises">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="shadow-lg border-border mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/elderly">
                  <Button className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-6" data-testid="button-back">
                    <ArrowLeft size={20} className="mr-2" /> Volver
                  </Button>
                </Link>
                <div>
                  <h1 className="responsive-text-3xl font-bold text-foreground flex items-center gap-2" data-testid="title">
                    <Brain size={32} className="text-primary" />
                    Ejercicios de Memoria
                  </h1>
                  <p className="text-muted-foreground">Entrena tu mente de forma divertida</p>
                </div>
              </div>
              
              {/* Score Display */}
              <div className="flex gap-4">
                <div className="text-center px-4 py-2 bg-yellow-100 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Trophy size={24} className="text-yellow-600" />
                    <div>
                      <p className="responsive-text text-gray-600">Puntos</p>
                      <p className="responsive-text-2xl font-bold text-yellow-600" data-testid="score">{score}</p>
                    </div>
                  </div>
                </div>
                <div className="text-center px-4 py-2 bg-purple-100 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Target size={24} className="text-purple-600" />
                    <div>
                      <p className="responsive-text text-gray-600">Racha</p>
                      <p className="responsive-text-2xl font-bold text-purple-600" data-testid="streak">{streak}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card className="shadow-lg border-border">
          <CardContent className="p-8">
            {exercisePhase === "menu" && (
              <div className="space-y-6">
                {/* Difficulty Selector */}
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-4">Selecciona la dificultad:</h3>
                  <div className="flex justify-center gap-4">
                    {(["easy", "medium", "hard"] as Difficulty[]).map((diff) => (
                      <Button
                        key={diff}
                        onClick={() => setSelectedDifficulty(diff)}
                        className={`px-6 py-3 text-lg ${
                          selectedDifficulty === diff
                            ? "ring-2 ring-primary"
                            : ""
                        } ${getDifficultyColor(diff)}`}
                        data-testid={`difficulty-${diff}`}
                      >
                        {diff === "easy" ? "Fácil" : diff === "medium" ? "Medio" : "Difícil"}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Exercise Types */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Button
                    onClick={() => startExercise("words")}
                    className="elderly-large-button bg-blue-500 hover:bg-blue-600 text-white h-auto min-h-32"
                    data-testid="exercise-words"
                  >
                    <div className="text-center space-y-3 py-4">
                      <span className="text-6xl block">📝</span>
                      <p className="elderly-text font-bold">Palabras</p>
                      <p className="responsive-text opacity-90 leading-relaxed">Memoriza palabras importantes</p>
                    </div>
                  </Button>

                  <Button
                    onClick={() => startExercise("numbers")}
                    className="elderly-large-button bg-green-500 hover:bg-green-600 text-white h-auto min-h-32"
                    data-testid="exercise-numbers"
                  >
                    <div className="text-center space-y-3 py-4">
                      <span className="text-6xl block">🔢</span>
                      <p className="elderly-text font-bold">Números</p>
                      <p className="responsive-text opacity-90 leading-relaxed">Recuerda secuencias numéricas</p>
                    </div>
                  </Button>

                  <Button
                    onClick={() => startExercise("sequences")}
                    className="elderly-large-button bg-purple-500 hover:bg-purple-600 text-white h-auto min-h-32"
                    data-testid="exercise-sequences"
                  >
                    <div className="text-center space-y-3 py-4">
                      <span className="text-6xl block">🎯</span>
                      <p className="elderly-text font-bold">Secuencias</p>
                      <p className="responsive-text opacity-90 leading-relaxed">Ordena elementos correctamente</p>
                    </div>
                  </Button>

                  <Button
                    onClick={() => startExercise("pairs")}
                    className="elderly-large-button bg-orange-500 hover:bg-orange-600 text-white h-auto min-h-32"
                    data-testid="exercise-pairs"
                  >
                    <div className="text-center space-y-3 py-4">
                      <span className="text-6xl block">🔗</span>
                      <p className="elderly-text font-bold">Asociaciones</p>
                      <p className="responsive-text opacity-90 leading-relaxed">Conecta palabras relacionadas</p>
                    </div>
                  </Button>

                  <Button
                    onClick={() => startExercise("stories")}
                    className="elderly-large-button bg-pink-500 hover:bg-pink-600 text-white h-auto min-h-32"
                    data-testid="exercise-stories"
                  >
                    <div className="text-center space-y-3 py-4">
                      <span className="text-6xl block">📖</span>
                      <p className="elderly-text font-bold">Historias</p>
                      <p className="responsive-text opacity-90 leading-relaxed">Recuerda detalles de historias cortas</p>
                    </div>
                  </Button>

                  <Button
                    onClick={() => startExercise("pairs-cards")}
                    className="elderly-large-button bg-teal-500 hover:bg-teal-600 text-white h-auto min-h-32"
                    data-testid="exercise-pairs-cards"
                  >
                    <div className="text-center space-y-3 py-4">
                      <span className="text-6xl block">🃏</span>
                      <p className="elderly-text font-bold">Empareja las Cartas</p>
                      <p className="responsive-text opacity-90 leading-relaxed">Encuentra las parejas iguales</p>
                    </div>
                  </Button>
                </div>

                <div className="mt-8 p-4 bg-blue-50 rounded-xl">
                  <p className="text-center text-lg text-gray-700">
                    💡 <strong>Consejo:</strong> Practica diariamente para mejorar tu memoria
                  </p>
                </div>
              </div>
            )}

            {exercisePhase === "memorize" && renderMemorizePhase()}
            {exercisePhase === "recall" && renderRecallPhase()}
            {exercisePhase === "result" && renderResultPhase()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}