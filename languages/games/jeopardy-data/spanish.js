/* Language Jeopardy: Spanish question bank.
   Same shape as french.js: window.LJ_BANK.spanish = { <strand key>: [ [pts, question, answer, alternatives, note], ... ] }
   15 questions per strand, three at each of 100-500 in order. Alternatives are separated by " | ".
   Nothing here needs the subjunctive: both boards' current specifications leave it out. */
window.LJ_BANK = window.LJ_BANK || {};
window.LJ_BANK.spanish = {

identity: [
 [100,"Translate into Spanish: my brother","mi hermano","","Masculine noun."],
 [100,"Translate into Spanish: my best friend (a girl)","mi mejor amiga","","mejor does not change for gender; amiga is feminine."],
 [100,"What does “los abuelos” mean in English?","grandparents","","Also: grandfather and grandmother."],
 [200,"Translate into Spanish: I get on well with my sister.","Me llevo bien con mi hermana.","","llevarse is reflexive: me llevo."],
 [200,"Translate into Spanish: He is tall and he has brown eyes.","Es alto y tiene los ojos marrones.","Es alto y tiene los ojos castaños.","Eyes take tener + los ojos + adjective in the plural."],
 [200,"What does “Mis padres están divorciados” mean?","My parents are divorced.","","divorciados agrees with the plural subject. Marital status uses estar."],
 [300,"Give the correct form of the adjective: Mi hermana es ______. (bajo)","baja","","The adjective agrees with hermana, which is feminine."],
 [300,"Complete with the correct possessive: ______ padres viven en Madrid. (my)","Mis","","padres is plural, so mis."],
 [300,"Complete with the reflexive pronoun: ______ llevamos bien. (we)","Nos","","Nos llevamos bien."],
 [400,"Translate into Spanish: My sister is older than me.","Mi hermana es mayor que yo.","","mayor = older. It is irregular and does not change for gender. After que, Spanish uses yo, not mí."],
 [400,"Translate into Spanish: My best friend (a girl) is funny and kind.","Mi mejor amiga es divertida y simpática.","","Adjectives agree with amiga; simpática keeps its accent."],
 [400,"Translate into Spanish: I don’t see my cousins very often.","No veo a mis primos muy a menudo.","No veo a mis primos con frecuencia. | Veo a mis primos pocas veces.","Personal a before a person as the object."],
 [500,"Translate into Spanish: Last weekend I went out with my friends and we had fun.","El fin de semana pasado salí con mis amigos y nos divertimos mucho.","El fin de semana pasado salí con mis amigos y lo pasamos bien.","Preterite: salí, nos divertimos (reflexive divertirse)."],
 [500,"Translate into Spanish: In the future, I would like to get married and have two children.","En el futuro, me gustaría casarme y tener dos hijos.","","me gustaría + infinitive. casarse is reflexive: me before casarme."],
 [500,"Translate into Spanish: My parents have been married for twenty years.","Mis padres están casados desde hace veinte años.","Mis padres llevan casados veinte años.","Higher. Present tense with desde hace for something still true."]
],

healthy: [
 [100,"Translate into Spanish: breakfast","el desayuno","","Masculine."],
 [100,"What does “las verduras” mean in English?","vegetables","","Feminine plural."],
 [100,"Translate into Spanish: water","el agua","","agua is feminine but takes el because it starts with a stressed a."],
 [200,"Translate into Spanish: I have a headache.","Me duele la cabeza.","Tengo dolor de cabeza.","doler works like gustar: the thing that hurts is the subject."],
 [200,"Translate into Spanish: I eat fruit every day.","Como fruta todos los días.","","todos los días = every day."],
 [200,"What does “Hay que dormir ocho horas” mean?","You have to / must sleep eight hours.","One must sleep eight hours.","hay que + infinitive expresses a general necessity."],
 [300,"Give the “yo” form of hacer in the present tense.","hago","","Irregular in the yo form only."],
 [300,"Complete with the correct form of doler: Me ______ los pies.","duelen","","Plural subject los pies, so duelen."],
 [300,"Give the “yo” form of poder in the present tense.","puedo","","Stem change o → ue."],
 [400,"Translate into Spanish: I don’t smoke because it is bad for your health.","No fumo porque es malo para la salud.","No fumo porque es malo para tu salud.","Accept any sensible article or possessive before salud."],
 [400,"Translate into Spanish: Yesterday I ate too much chocolate.","Ayer comí demasiado chocolate.","","Preterite of comer: comí (accent). demasiado + noun."],
 [400,"Translate into Spanish: I do sport three times a week to stay fit.","Hago deporte tres veces a la semana para estar en forma.","Hago deporte tres veces a la semana para mantenerme en forma.","para + infinitive for “in order to”."],
 [500,"Translate into Spanish: To be healthier, I am going to eat less sugar and drink more water.","Para estar más sano, voy a comer menos azúcar y beber más agua.","Para estar más saludable, voy a comer menos azúcar y beber más agua.","Near future: ir a + infinitive. menos / más + noun."],
 [500,"Translate into Spanish: When I was younger, I used to eat lots of sweets.","Cuando era más joven, comía muchos caramelos.","Cuando era más joven, comía muchos dulces.","Imperfect for habit: era, comía."],
 [500,"Translate into Spanish: I will do more sport if I have time.","Haré más deporte si tengo tiempo.","","Higher. Future of hacer is irregular (haré); si is followed by the present tense."]
],

education: [
 [100,"Translate into Spanish: homework","los deberes","","Masculine plural. Also: la tarea."],
 [100,"What does “el instituto” mean in English?","(secondary) school","high school",""],
 [100,"What does “una enfermera” mean in English?","a (female) nurse","a nurse","Feminine form; a male nurse is un enfermero."],
 [200,"Translate into Spanish: My favourite subject is history.","Mi asignatura favorita es la historia.","Mi materia favorita es la historia.","asignatura is feminine, so favorita."],
 [200,"Translate into Spanish: We have lessons from half past eight to three o’clock.","Tenemos clases desde las ocho y media hasta las tres.","","desde … hasta = from … to."],
 [200,"What does “Soy muy malo en matemáticas” mean?","I’m very bad at maths.","I’m terrible at maths.","ser malo en = to be bad at."],
 [300,"Give the feminine of “el actor”.","la actriz","",""],
 [300,"Complete: Voy ______ instituto en autobús. (a + el)","al","","a + el always contracts to al."],
 [300,"Give the “nosotros” form of tener in the present tense.","tenemos","",""],
 [400,"Translate into Spanish: I think school uniform is useless because everyone looks the same.","Creo que el uniforme escolar es inútil porque todo el mundo parece igual.","Creo que el uniforme escolar es inútil porque todos parecen iguales.","Accept any accurate way of saying “looks the same”."],
 [400,"Translate into Spanish: Last year I studied Spanish and I passed my exam.","El año pasado estudié español y aprobé el examen.","","Two preterites: estudié, aprobé."],
 [400,"Translate into Spanish: My mother works in a bank and my father is a mechanic.","Mi madre trabaja en un banco y mi padre es mecánico.","","No article before a job after ser."],
 [500,"Translate into Spanish: After my exams I want to study science because I would like to be a doctor.","Después de mis exámenes quiero estudiar ciencias porque me gustaría ser médico.","Después de mis exámenes quiero estudiar ciencias porque me gustaría ser médica.","quiero + infinitive; me gustaría + infinitive. médica if the speaker is a woman."],
 [500,"Translate into Spanish: In the future, I will work in a hospital because I like helping people.","En el futuro trabajaré en un hospital porque me gusta ayudar a la gente.","","Higher. Future tense: trabajaré. ayudar a + person."],
 [500,"Translate into Spanish: I have been learning Spanish for five years.","Aprendo español desde hace cinco años.","Llevo cinco años aprendiendo español.","Higher. Present tense + desde hace, NOT the perfect tense."]
],

freetime: [
 [100,"Translate into Spanish: to play football","jugar al fútbol","","jugar a + sport. Accent on fútbol."],
 [100,"What does “la natación” mean in English?","swimming","",""],
 [100,"Translate into Spanish: the film","la película","","Feminine."],
 [200,"Translate into Spanish: I play the guitar.","Toco la guitarra.","","tocar for instruments (jugar for sports and games)."],
 [200,"Translate into Spanish: I like going to the cinema with my friends.","Me gusta ir al cine con mis amigos.","","me gusta + infinitive."],
 [200,"What does “No me gusta nada ver la tele” mean?","I don’t like watching TV at all.","","no … nada = not at all."],
 [300,"Complete with the correct form of gustar: Me ______ los deportes.","gustan","","The things you like are plural, so gustan."],
 [300,"Give the “yo” form of jugar in the present tense.","juego","","Stem change u → ue."],
 [300,"Complete with the article: Me gustan ______ películas de terror.","las","","películas is feminine plural."],
 [400,"Translate into Spanish: On Saturdays I usually go swimming and then I watch a film.","Los sábados normalmente voy a nadar y luego veo una película.","Los sábados suelo ir a nadar y luego veo una película.","Los sábados = every Saturday (plural article, no preposition)."],
 [400,"Translate into Spanish: Last weekend I went to a concert with my cousin.","El fin de semana pasado fui a un concierto con mi primo.","El fin de semana pasado fui a un concierto con mi prima.","Preterite of ir: fui (no accent)."],
 [400,"Translate into Spanish: My favourite sport is rugby because it is exciting.","Mi deporte favorito es el rugby porque es emocionante.","Mi deporte favorito es el rugby porque es apasionante.","deporte is masculine, so favorito."],
 [500,"Translate into Spanish: If it rains this weekend, I will stay at home and read a book.","Si llueve este fin de semana, me quedaré en casa y leeré un libro.","Si llueve este fin de semana, voy a quedarme en casa y leer un libro.","Higher. si + present, then the future (me quedaré, leeré). Near future is also acceptable."],
 [500,"Translate into Spanish: When I was little, I used to play in the garden every day.","Cuando era pequeño/a, jugaba en el jardín todos los días.","","Imperfect for repeated past actions."],
 [500,"Translate into Spanish: I would like to learn to play the drums because I love music.","Me gustaría aprender a tocar la batería porque me encanta la música.","","aprender a + infinitive; tocar for instruments."]
],

customs: [
 [100,"Translate into Spanish: Christmas","la Navidad","","Feminine; capital N."],
 [100,"What does “los fuegos artificiales” mean in English?","fireworks","",""],
 [100,"Translate into Spanish: the birthday","el cumpleaños","","Masculine, and the singular and plural look the same."],
 [200,"Translate into Spanish: We celebrate Christmas with the family.","Celebramos la Navidad en familia.","Celebramos la Navidad con la familia.","en familia = with the family."],
 [200,"Translate into Spanish: On New Year’s Eve there is a big party.","En Nochevieja hay una gran fiesta.","En Nochevieja hay una fiesta grande.","gran before a singular noun means “great / big”."],
 [200,"What does “Damos regalos” mean?","We give presents.","","dar: damos."],
 [300,"Give the plural of “la tradición”.","las tradiciones","","The accent drops in the plural."],
 [300,"Complete with the correct form of celebrar: Nosotros ______ el cumpleaños de mi abuela.","celebramos","",""],
 [300,"Complete with el or la: ______ día de Reyes es el seis de enero.","El","","día is masculine despite ending in -a."],
 [400,"Translate into Spanish: Last Christmas we ate turkey and opened the presents at midnight.","La Navidad pasada comimos pavo y abrimos los regalos a medianoche.","","Preterite: comimos, abrimos."],
 [400,"Translate into Spanish: In my family we do not celebrate Easter, but we celebrate Eid.","En mi familia no celebramos la Semana Santa, pero celebramos el Eid.","En mi familia no celebramos la Pascua, pero celebramos el Eid.","Accept Id al-Fitr or Aid."],
 [400,"Translate into Spanish: I think festivals are important because they bring people together.","Creo que las fiestas son importantes porque unen a la gente.","Creo que las fiestas son importantes porque reúnen a la gente.","Personal a before gente."],
 [500,"Translate into Spanish: Next year I am going to spend New Year’s Eve in Madrid with my friends.","El año que viene voy a pasar la Nochevieja en Madrid con mis amigos.","El próximo año voy a pasar la Nochevieja en Madrid con mis amigos.","Near future: voy a + infinitive."],
 [500,"Translate into Spanish: At the carnival, people wore costumes and danced in the streets.","En el carnaval la gente llevaba disfraces y bailaba en las calles.","","Imperfect describes the scene. la gente takes a singular verb."],
 [500,"Translate into Spanish: The festival I like most is Las Fallas because there are fireworks and a lot of people in the street.","La fiesta que más me gusta es las Fallas porque hay fuegos artificiales y mucha gente en la calle.","La fiesta que más me gusta son las Fallas porque hay fuegos artificiales y mucha gente en la calle.","que más me gusta = that I like most. hay = there is / are."]
],

celebrity: [
 [100,"Translate into Spanish: the singer (a woman)","la cantante","","cantante is the same for men and women; only the article changes."],
 [100,"What does “famoso” mean in English?","famous","",""],
 [100,"What does “un seguidor” mean in English?","a follower / a fan","",""],
 [200,"Translate into Spanish: He is a famous actor.","Es un actor famoso.","","Adjective after the noun."],
 [200,"What does “Gana mucho dinero” mean?","He / She earns a lot of money.","He / She wins a lot of money.","ganar = to earn or to win."],
 [200,"Translate into Spanish: I admire this sportsman.","Admiro a este deportista.","Admiro a ese deportista.","Personal a before a person."],
 [300,"Give the feminine of “el cantante”.","la cantante","","The noun does not change."],
 [300,"Complete with the correct form: Esa cantante es muy ______. (conocido)","conocida","","Agrees with cantante."],
 [300,"Give the “yo” form of ver in the preterite.","vi","","No accent: vi."],
 [400,"Translate into Spanish: I think celebrities have too much influence on young people.","Creo que los famosos tienen demasiada influencia en los jóvenes.","Creo que los famosos tienen demasiada influencia sobre los jóvenes.","demasiada agrees with influencia."],
 [400,"Translate into Spanish: Last year I saw my favourite singer in concert.","El año pasado vi a mi cantante favorito en concierto.","El año pasado vi a mi cantante favorita en concierto.","Preterite of ver (vi) and personal a."],
 [400,"Translate into Spanish: Being famous isn’t always easy because you have no private life.","Ser famoso no siempre es fácil porque no tienes vida privada.","Ser famoso no siempre es fácil porque no se tiene vida privada.","Infinitive as subject."],
 [500,"Translate into Spanish: Some famous people give money to charity and that is a good example for fans.","Algunos famosos dan dinero a organizaciones benéficas y es un buen ejemplo para los fans.","Algunos famosos dan dinero a organizaciones benéficas y es un buen ejemplo para los seguidores.","bueno shortens to buen before a masculine singular noun."],
 [500,"Translate into Spanish: If I am famous one day, I will help poor people.","Si algún día soy famoso, ayudaré a los pobres.","Si algún día soy famosa, ayudaré a la gente pobre.","Higher. si + present, then the future (ayudaré)."],
 [500,"Translate into Spanish: He has been a footballer for ten years and he plays for a big team.","Es futbolista desde hace diez años y juega en un equipo grande.","Lleva diez años siendo futbolista y juega en un equipo grande.","Higher. Present + desde hace. No article before a job after ser."]
],

travel: [
 [100,"Translate into Spanish: the hotel","el hotel","","Masculine."],
 [100,"What does “la playa” mean in English?","the beach","",""],
 [100,"Translate into Spanish: the ticket (for a journey)","el billete","","Latin American Spanish: el boleto."],
 [200,"Translate into Spanish: I would like a double room for two nights.","Quisiera una habitación doble para dos noches.","Me gustaría una habitación doble para dos noches.","Quisiera / me gustaría are polite forms."],
 [200,"What does “¿Dónde está la estación, por favor?” mean?","Where is the station, please?","","Location uses estar."],
 [200,"Translate into Spanish: We are going to stay in a campsite.","Vamos a alojarnos en un camping.","Vamos a quedarnos en un camping.","Near future with a reflexive verb: alojarnos."],
 [300,"Give the “yo” form of ir in the preterite.","fui","","Same as the preterite of ser."],
 [300,"Give the “yo” form of salir in the present tense.","salgo","","Irregular in the yo form."],
 [300,"Ser or estar? Complete: La playa ______ cerca del hotel.","está (estar)","","Location uses estar."],
 [400,"Translate into Spanish: Last summer we visited Barcelona and we went to the beach every day.","El verano pasado visitamos Barcelona e íbamos a la playa todos los días.","El verano pasado visitamos Barcelona y fuimos a la playa todos los días.","Preterite for the visit, imperfect for the habit. y becomes e before an i- sound; accept y if the second verb is fuimos."],
 [400,"Translate into Spanish: The weather was lovely and it was sunny every day.","Hacía buen tiempo y hacía sol todos los días.","Hizo buen tiempo y hizo sol todos los días.","Weather description: imperfect of hacer."],
 [400,"Translate into Spanish: I prefer holidays by the sea because I love swimming.","Prefiero las vacaciones junto al mar porque me encanta nadar.","Prefiero las vacaciones en la costa porque me encanta nadar.","vacaciones is always plural. me encanta + infinitive."],
 [500,"Translate into Spanish: Next summer I am going to travel to Spain by plane with my family and we will stay in a hotel near the beach.","El verano que viene voy a viajar a España en avión con mi familia y nos alojaremos en un hotel cerca de la playa.","El próximo verano voy a viajar a España en avión con mi familia y vamos a alojarnos en un hotel cerca de la playa.","Near future is fine for both verbs; the simple future (alojaremos) is Higher."],
 [500,"Translate into Spanish: Unfortunately the train was late and we missed the bus.","Desgraciadamente, el tren llegó tarde y perdimos el autobús.","Por desgracia, el tren llegó con retraso y perdimos el autobús.","Preterite for completed events: llegó, perdimos."],
 [500,"Translate into Spanish: If I have the money, I will travel to Peru next year.","Si tengo dinero, viajaré a Perú el año que viene.","Si tengo el dinero, viajaré a Perú el próximo año.","Higher. si + present, then the future (viajaré)."]
],

media: [
 [100,"Translate into Spanish: the mobile phone","el móvil","el teléfono móvil","Masculine."],
 [100,"What does “una red social” mean in English?","a social network","",""],
 [100,"Translate into Spanish: the computer","el ordenador","la computadora","Latin American Spanish: la computadora."],
 [200,"Translate into Spanish: I spend two hours a day on my phone.","Paso dos horas al día en el móvil.","Paso dos horas al día con el móvil.","pasar + time."],
 [200,"What does “Juego a videojuegos con mis amigos en línea” mean?","I play video games online with my friends.","","en línea = online."],
 [200,"Translate into Spanish: I send messages to my friends.","Envío mensajes a mis amigos.","","envío has an accent: envío."],
 [300,"Give the “yo” form of enviar in the present tense.","envío","","Accent on the í."],
 [300,"Give the correct form of the verb: Mis padres no ______ usar esta aplicación. (poder)","pueden","","ellos form: pueden."],
 [300,"Give the plural of “el correo electrónico”.","los correos electrónicos","","Both noun and adjective become plural."],
 [400,"Translate into Spanish: Social media is useful, but it can be dangerous.","Las redes sociales son útiles, pero pueden ser peligrosas.","","Plural noun, so plural verb and adjectives."],
 [400,"Translate into Spanish: Yesterday I downloaded a new game and I played all evening.","Ayer descargué un juego nuevo y jugué toda la tarde.","Ayer descargué un juego nuevo y jugué toda la noche.","Preterite: descargué (spelling change g → gu), jugué."],
 [400,"Translate into Spanish: I never post photos because I want to protect my private life.","Nunca publico fotos porque quiero proteger mi vida privada.","No publico nunca fotos porque quiero proteger mi vida privada.","nunca before the verb needs no no."],
 [500,"Translate into Spanish: Without technology, my life would be more boring.","Sin la tecnología, mi vida sería más aburrida.","Sin tecnología, mi vida sería más aburrida.","Higher. Conditional of ser: sería."],
 [500,"Translate into Spanish: I think young people spend too much time online, so they do not talk to their family.","Creo que los jóvenes pasan demasiado tiempo en línea, así que no hablan con su familia.","Creo que los jóvenes pasan demasiado tiempo en línea, por eso no hablan con su familia.","así que = so / therefore."],
 [500,"Translate into Spanish: While watching a series, I often check my phone.","Mientras veo una serie, miro el móvil a menudo.","Viendo una serie, miro el móvil a menudo.","Higher for the gerund version. mientras + present is also correct."]
],

environment: [
 [100,"Translate into Spanish: the village","el pueblo","","Masculine."],
 [100,"What does “el reciclaje” mean in English?","recycling","",""],
 [100,"Translate into Spanish: the park","el parque","",""],
 [200,"Translate into Spanish: There is a park near my house.","Hay un parque cerca de mi casa.","","hay = there is / there are."],
 [200,"What does “Hay mucha contaminación en la ciudad” mean?","There is a lot of pollution in the city.","","mucha agrees with contaminación (f.)."],
 [200,"Translate into Spanish: I live in a small town in the north of England.","Vivo en una ciudad pequeña en el norte de Inglaterra.","Vivo en un pueblo pequeño en el norte de Inglaterra.","Accept ciudad or pueblo."],
 [300,"Complete with the correct word: El supermercado está ______ el banco y la oficina de correos. (between)","entre","",""],
 [300,"Choose hay or está: ______ un museo en mi ciudad.","Hay","","hay introduces something; está locates a known thing."],
 [300,"Give the plural of “el animal”.","los animales","",""],
 [400,"Translate into Spanish: To protect the environment, we must recycle more.","Para proteger el medio ambiente, debemos reciclar más.","Para proteger el medio ambiente, hay que reciclar más.","para + infinitive; debemos or hay que."],
 [400,"Translate into Spanish: In my area there are not enough activities for young people.","En mi barrio no hay suficientes actividades para los jóvenes.","","suficientes agrees with actividades."],
 [400,"Translate into Spanish: I turn off the lights and I go to school by bike.","Apago las luces y voy al instituto en bicicleta.","Apago la luz y voy al instituto en bici.","en bicicleta for transport."],
 [500,"Translate into Spanish: Last year they built a new sports centre and it is great for the town.","El año pasado construyeron un nuevo polideportivo y es genial para la ciudad.","El año pasado construyeron un nuevo centro deportivo y es genial para la ciudad.","Preterite of construir (construyeron). nuevo goes before polideportivo here."],
 [500,"Translate into Spanish: If we do not act now, the planet will be in danger.","Si no actuamos ahora, el planeta estará en peligro.","","Higher. si + present, then the future (estará)."],
 [500,"Translate into Spanish: In the future, I would like to live in the countryside because it is calmer than the city.","En el futuro me gustaría vivir en el campo porque es más tranquilo que la ciudad.","","más … que comparison."]
],

"g-verbs": [
 [100,"Give the “yo” form of tener in the present tense.","tengo","","Irregular in the yo form."],
 [100,"Give the “tú” form of ser in the present tense.","eres","",""],
 [100,"What does “va” mean in English?","he / she goes (is going)","it goes","ir: yo voy, tú vas, él va."],
 [200,"Give the “nosotros” form of ir in the present tense.","vamos","",""],
 [200,"Give the past participle of hacer.","hecho","",""],
 [200,"Put “comer” into the perfect tense with “yo”.","he comido","","haber + past participle."],
 [300,"Ser or estar? Complete: Mi hermana ______ profesora.","es (ser)","","Jobs use ser."],
 [300,"Translate into Spanish: I am going to play.","Voy a jugar.","","Near future: ir a + infinitive."],
 [300,"Give the “yo” form of ser in the imperfect tense.","era","","Irregular: era, eras, era."],
 [400,"Translate into Spanish: She went out last night.","Salió anoche.","Ella salió anoche.","Preterite of salir, 3rd person singular, with an accent."],
 [400,"Translate into Spanish: He used to play football every Saturday.","Jugaba al fútbol todos los sábados.","Él jugaba al fútbol cada sábado.","Imperfect for a repeated habit."],
 [400,"Translate into Spanish: I have just finished my homework.","Acabo de terminar los deberes.","Acabo de terminar mi tarea.","Higher. acabar de + infinitive = to have just done."],
 [500,"Translate into Spanish: I woke up at seven, I got dressed and I went to school.","Me desperté a las siete, me vestí y fui al instituto.","Me desperté a las siete, me vestí y fui al colegio.","Reflexive preterite: me desperté, me vestí; fui = I went."],
 [500,"Translate into Spanish: Tomorrow I will have a lot of homework.","Mañana tendré muchos deberes.","Mañana tendré mucha tarea.","Higher. Future of tener is irregular: tendré."],
 [500,"Translate into English: Llovía cuando llegamos.","It was raining when we arrived.","","Imperfect sets the scene (llovía); preterite gives the event (llegamos)."]
],

"g-forms": [
 [100,"Give the feminine of “pequeño”.","pequeña","",""],
 [100,"Translate into Spanish: a (with a feminine noun)","una","",""],
 [100,"Give the plural of “el lápiz”.","los lápices","","z becomes c before -es."],
 [200,"Give the feminine of “trabajador”.","trabajadora","","Adjectives ending in -or add -a."],
 [200,"Make this negative: Como carne.","No como carne.","","no goes before the verb."],
 [200,"Translate into Spanish: because","porque","","One word, no accent (the question word is por qué)."],
 [300,"Complete with a, al or a la: Voy ______ playa.","a la","","playa is feminine."],
 [300,"Give “my” with the plural noun “amigos”.","mis","",""],
 [300,"Translate into Spanish: He is taller than me.","Es más alto que yo.","Él es más alto que yo.","más + adjective + que; after que Spanish uses yo."],
 [400,"Translate into Spanish: a big house","una casa grande","","grande goes after the noun."],
 [400,"Translate into Spanish: I have no brothers or sisters.","No tengo hermanos.","No tengo hermanos ni hermanas.","No article is needed after no tengo. Hermanos covers brothers and sisters."],
 [400,"Translate into Spanish: I think that it is very important.","Creo que es muy importante.","Pienso que es muy importante.","que cannot be dropped, as in English."],
 [500,"Translate into Spanish: She says that she does not like her new school.","Dice que no le gusta su nuevo instituto.","Dice que no le gusta su nuevo colegio.","gustar construction: no le gusta (to her)."],
 [500,"Translate into Spanish: It was raining, but we played football anyway.","Llovía, pero jugamos al fútbol de todas formas.","Llovía, pero jugamos al fútbol igualmente.","Imperfect for the background, preterite for the action."],
 [500,"Translate into Spanish: The film that I saw yesterday was excellent.","La película que vi ayer fue excelente.","La película que vi ayer era excelente.","que introduces the relative clause. fue or era both work."]
]
};
