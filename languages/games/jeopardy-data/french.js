/* Language Jeopardy: French question bank.
   window.LJ_BANK.french = { <strand key>: [ [pts, question, answer, alternatives, note], ... ] }
   Each strand holds 15 questions: three at each of 100/200/300/400/500, in that order.
   Alternatives are separated by " | ". The page builds each question's stable ID as
   fr-<strand>-<pts>-<1..3> from its position, so never reorder or delete existing questions.
   Items that use structures from the Higher-tier grammar lists say "Higher" in the note. */
window.LJ_BANK = window.LJ_BANK || {};
window.LJ_BANK.french = {

identity: [
 [100,"Translate into French: my brother","mon frère","","Masculine noun, so mon."],
 [100,"Translate into French: my best friend (a girl)","ma meilleure amie","","meilleure and amie are both feminine."],
 [100,"What does “les grands-parents” mean in English?","grandparents","",""],
 [200,"Translate into French: I get on well with my sister.","Je m’entends bien avec ma sœur.","Je m’entends bien avec ma soeur.","s’entendre is reflexive, so me becomes m’ before the vowel."],
 [200,"Translate into French: He is tall and he has brown eyes.","Il est grand et il a les yeux marron.","Il est grand et il a les yeux bruns.","Eye colour takes avoir + les yeux. marron never takes an -s."],
 [200,"What does “Mes parents sont divorcés” mean?","My parents are divorced.","","divorcés agrees with the plural noun parents."],
 [300,"Give the correct form of the adjective: Ma sœur est ______. (petit)","petite","","The adjective agrees with sœur, which is feminine."],
 [300,"Complete with the correct possessive: ______ parents habitent à Lyon. (my)","Mes","","parents is plural, so mes."],
 [300,"Complete with the reflexive pronoun: Nous ______ entendons bien.","nous","","Nous nous entendons bien."],
 [400,"Translate into French: My sister is older than me.","Ma sœur est plus âgée que moi.","","plus … que for comparing. âgée takes an extra -e because it describes a girl."],
 [400,"Translate into French: My best friend (a girl) is funny and kind.","Ma meilleure amie est drôle et gentille.","","drôle does not change in the feminine; gentil becomes gentille."],
 [400,"Translate into French: I don’t often see my cousins.","Je ne vois pas souvent mes cousins.","Je ne vois pas très souvent mes cousins.","ne … pas surrounds the verb; souvent follows pas."],
 [500,"Translate into French: Last weekend I went out with my friends and we had fun.","Le week-end dernier, je suis sorti(e) avec mes amis et nous nous sommes amusés.","Le week-end dernier, je suis sorti(e) avec mes amis et on s’est amusé.","Higher (reflexive perfect). sortir takes être, so the participle agrees with the subject; s’amuser also takes être."],
 [500,"Translate into French: In the future, I would like to get married and have two children.","Dans le futur, je voudrais me marier et avoir deux enfants.","À l’avenir, je voudrais me marier et avoir deux enfants.","je voudrais + infinitive. se marier is reflexive: me before the infinitive."],
 [500,"Translate into French: My parents have been married for twenty years.","Mes parents sont mariés depuis vingt ans.","","Higher. Present tense with depuis for an action still going on."]
],

healthy: [
 [100,"Translate into French: breakfast","le petit déjeuner","","Masculine."],
 [100,"What does “les légumes” mean in English?","vegetables","",""],
 [100,"Translate into French: water","l’eau","","l’eau is feminine."],
 [200,"Translate into French: I have a headache.","J’ai mal à la tête.","","avoir mal à + part of body: à la tête (feminine)."],
 [200,"Translate into French: I eat fruit every day.","Je mange des fruits tous les jours.","Je mange du fruit tous les jours.","tous les jours = every day."],
 [200,"What does “Il faut dormir huit heures par nuit” mean?","You must / need to sleep eight hours a night.","One has to sleep eight hours a night.","il faut + infinitive expresses necessity."],
 [300,"Complete with du, de la, de l’ or des: Je bois ______ lait. (milk, masculine)","du","","Partitive article: some milk."],
 [300,"Give the “je” form of the verb boire in the present tense.","je bois","","Irregular: je bois, tu bois, il boit, nous buvons."],
 [300,"Complete: Je ne mange pas ______ viande.","de","","After a negative, du / de la / des becomes de (d’ before a vowel)."],
 [400,"Translate into French: I don’t smoke because it is bad for your health.","Je ne fume pas parce que c’est mauvais pour la santé.","Je ne fume pas parce que c’est mauvais pour votre santé.","Accept any sensible pronoun or article before santé."],
 [400,"Translate into French: Yesterday I ate too much chocolate.","Hier, j’ai mangé trop de chocolat.","","Perfect tense with avoir. trop de + noun, with no article."],
 [400,"Translate into French: I do sport three times a week to stay fit.","Je fais du sport trois fois par semaine pour rester en forme.","","faire du sport; pour + infinitive for “in order to”."],
 [500,"Translate into French: To be in better health, I am going to eat less sugar and drink more water.","Pour être en meilleure santé, je vais manger moins de sucre et boire plus d’eau.","","aller + infinitive for the near future. moins de / plus de + noun."],
 [500,"Translate into French: When I was younger, I used to eat a lot of sweets.","Quand j’étais plus jeune, je mangeais beaucoup de bonbons.","","Imperfect for a habit in the past: j’étais, je mangeais."],
 [500,"Translate into French: If I had more time, I would do more sport.","Si j’avais plus de temps, je ferais plus de sport.","","Higher. si + imperfect, then the conditional (ferais)."]
],

education: [
 [100,"Translate into French: homework","les devoirs","","Plural in French, masculine."],
 [100,"What does “la cantine” mean in English?","the canteen / school dining hall","",""],
 [100,"What does “un infirmier” mean in English?","a (male) nurse","a nurse",""],
 [200,"Translate into French: My favourite subject is history.","Ma matière préférée est l’histoire.","","matière is feminine, so ma and préférée."],
 [200,"Translate into French: We have lessons from half past eight to four o’clock.","Nous avons cours de huit heures et demie à quatre heures.","Nous avons des cours de 8h30 à 16h.","The 24-hour clock (seize heures) is also correct."],
 [200,"What does “Je suis nul en maths” mean?","I’m rubbish / bad at maths.","I’m useless at maths.","Informal; nul en = rubbish at."],
 [300,"Give the feminine of “un acteur”.","une actrice","","-teur often becomes -trice."],
 [300,"Complete with au, à la, à l’ or aux: Je vais ______ collège en bus.","au","","collège is masculine."],
 [300,"Give the “nous” form of devoir in the present tense.","nous devons","","Je dois, tu dois, il doit, nous devons."],
 [400,"Translate into French: I think school uniform is useless because everyone looks the same.","Je pense que l’uniforme scolaire est inutile parce que tout le monde se ressemble.","Je pense que l’uniforme est inutile parce que tout le monde a l’air pareil.","Accept any accurate way of saying “looks the same”."],
 [400,"Translate into French: Last year I studied Spanish and I passed my exam.","L’année dernière, j’ai étudié l’espagnol et j’ai réussi mon examen.","L’année dernière, j’ai fait de l’espagnol et j’ai réussi mon examen.","Two perfect tense verbs, both with avoir."],
 [400,"Translate into French: My mother works in a bank and my father is a mechanic.","Ma mère travaille dans une banque et mon père est mécanicien.","","After être, jobs take no article: il est mécanicien."],
 [500,"Translate into French: After my exams, I want to study science at college because I would like to become a doctor.","Après mes examens, je veux étudier les sciences au lycée parce que je voudrais devenir médecin.","Après mes examens, je veux faire des études de sciences parce que je voudrais devenir médecin.","je veux + infinitive; je voudrais + infinitive. médecin has no feminine ending."],
 [500,"Translate into French: In the future, I will work in a hospital because I like helping people.","Dans le futur, je travaillerai dans un hôpital parce que j’aime aider les gens.","À l’avenir, je travaillerai dans un hôpital parce que j’aime aider les gens.","Higher. Future tense of travailler: je travaillerai."],
 [500,"Translate into French: I have been learning French for five years.","J’apprends le français depuis cinq ans.","","Higher. Present tense + depuis, NOT the perfect tense."]
],

freetime: [
 [100,"Translate into French: to play football","jouer au football","jouer au foot","jouer à + sport."],
 [100,"What does “la natation” mean in English?","swimming","",""],
 [100,"Translate into French: the film","le film","","Masculine."],
 [200,"Translate into French: I play the guitar.","Je joue de la guitare.","","jouer DE + instrument (but jouer À + sport)."],
 [200,"Translate into French: I like going to the cinema with my friends.","J’aime aller au cinéma avec mes amis.","","aimer + infinitive."],
 [200,"What does “Je n’aime pas du tout regarder la télé” mean?","I don’t like watching TV at all.","","ne … pas du tout = not at all."],
 [300,"Complete with au, à la, à l’ or aux: Je joue ______ tennis.","au","","tennis is masculine."],
 [300,"Give the “nous” form of faire in the present tense.","nous faisons","","Irregular."],
 [300,"Complete with du, de la, de l’ or des: Elle joue ______ piano.","du","","jouer de + le piano = du piano."],
 [400,"Translate into French: On Saturdays I usually go swimming and then I watch a film.","Le samedi, d’habitude, je vais nager, puis je regarde un film.","Le samedi, en général, je vais nager et ensuite je regarde un film.","Le samedi = every Saturday (no preposition)."],
 [400,"Translate into French: Last weekend I went to a concert with my cousin.","Le week-end dernier, je suis allé(e) à un concert avec mon cousin.","Le week-end dernier, je suis allé(e) à un concert avec ma cousine.","aller takes être in the perfect, so the participle agrees with the subject."],
 [400,"Translate into French: My favourite sport is rugby because it is exciting.","Mon sport préféré est le rugby parce que c’est passionnant.","Mon sport préféré est le rugby parce que c’est excitant.","sport is masculine, so mon … préféré."],
 [500,"Translate into French: If it rains this weekend, I will stay at home and read a book.","S’il pleut ce week-end, je resterai à la maison et je lirai un livre.","S’il pleut ce week-end, je vais rester à la maison et lire un livre.","Higher. si + present, then the future (resterai, lirai). Near future is also acceptable."],
 [500,"Translate into French: When I was little, I used to play in the garden every day.","Quand j’étais petit(e), je jouais dans le jardin tous les jours.","","Imperfect for repeated past actions."],
 [500,"Translate into French: I would like to learn to play the drums because I love music.","Je voudrais apprendre à jouer de la batterie parce que j’adore la musique.","","apprendre À + infinitive; jouer DE + instrument."]
],

customs: [
 [100,"Translate into French: Christmas","Noël","","Masculine; capital N."],
 [100,"What does “le feu d’artifice” mean in English?","firework(s) / fireworks display","",""],
 [100,"Translate into French: the birthday","l’anniversaire","","Masculine."],
 [200,"Translate into French: We celebrate Christmas with the family.","Nous fêtons Noël en famille.","On fête Noël en famille.","fêter = to celebrate."],
 [200,"Translate into French: On the fourteenth of July there is a big parade.","Le quatorze juillet, il y a un grand défilé.","Le 14 juillet, il y a un grand défilé.","Dates take le + cardinal number (not ordinal), except the first."],
 [200,"What does “On offre des cadeaux” mean?","People give presents.","We give presents. | You give presents.","on = people / we / one."],
 [300,"Give the plural of “un cadeau”.","des cadeaux","","Nouns ending in -eau add -x."],
 [300,"Complete with the correct form of fêter: Nous ______ l’anniversaire de ma grand-mère.","fêtons","","-er verb, nous ending."],
 [300,"Complete with du, de la, de l’ or des: À Pâques, on mange ______ chocolat.","du","","chocolat is masculine."],
 [400,"Translate into French: Last Christmas we ate turkey and we opened our presents at midnight.","Noël dernier, nous avons mangé de la dinde et nous avons ouvert nos cadeaux à minuit.","","Perfect tense: mangé, ouvert (irregular participle of ouvrir)."],
 [400,"Translate into French: In my family we do not celebrate Easter, but we celebrate Eid.","Dans ma famille, nous ne fêtons pas Pâques, mais nous fêtons l’Aïd.","Dans ma famille, on ne fête pas Pâques mais on fête l’Aïd.","Accept Aïd el-Fitr or Aïd el-Kébir."],
 [400,"Translate into French: I think festivals are important because they bring people together.","Je pense que les fêtes sont importantes parce qu’elles réunissent les gens.","Je pense que les fêtes sont importantes parce qu’elles rassemblent les gens.","importantes agrees with fêtes (f. pl.); elles refers back to fêtes."],
 [500,"Translate into French: Next year I am going to spend New Year’s Eve in Paris with my friends.","L’année prochaine, je vais passer le réveillon du Nouvel An à Paris avec mes amis.","L’année prochaine, je vais passer la Saint-Sylvestre à Paris avec mes amis.","Near future: aller + infinitive."],
 [500,"Translate into French: At the carnival, people wore costumes and danced in the streets.","Au carnaval, les gens portaient des costumes et dansaient dans les rues.","Au carnaval, les gens ont porté des costumes et ont dansé dans les rues.","Imperfect (description of a scene) is most natural; accept a correct perfect tense."],
 [500,"Translate into French: The festival I like most is Bastille Day because there are fireworks and a lot of people in the street.","La fête que j’aime le plus est le 14 juillet parce qu’il y a des feux d’artifice et beaucoup de monde dans la rue.","","que links the two parts (“that I like”). beaucoup de monde = lots of people."]
],

celebrity: [
 [100,"Translate into French: the singer (a woman)","la chanteuse","","-eur becomes -euse for many feminine job nouns."],
 [100,"What does “célèbre” mean in English?","famous","",""],
 [100,"Translate into French: a fan (a man)","un fan","",""],
 [200,"Translate into French: He is a famous actor.","C’est un acteur célèbre.","","c’est + un + noun. célèbre does not change in the feminine."],
 [200,"What does “Elle gagne beaucoup d’argent” mean?","She earns a lot of money.","She wins a lot of money.","gagner = to earn or to win. beaucoup de + noun."],
 [200,"Translate into French: I admire this sportsman.","J’admire ce sportif.","","ce before a masculine noun."],
 [300,"Give the feminine of “un chanteur”.","une chanteuse","",""],
 [300,"Complete with the correct form: Cette chanteuse est très ______. (connu)","connue","","Adjective agrees with chanteuse."],
 [300,"Give the past participle of the verb voir.","vu","","Irregular: j’ai vu."],
 [400,"Translate into French: I think celebrities have too much influence on young people.","Je pense que les célébrités ont trop d’influence sur les jeunes.","","les célébrités is feminine (even for male stars). trop d’ + noun."],
 [400,"Translate into French: Last year I saw my favourite singer in concert.","L’année dernière, j’ai vu ma chanteuse préférée en concert.","L’année dernière, j’ai vu mon chanteur préféré en concert.","Perfect tense of voir. Accept either gender."],
 [400,"Translate into French: Being famous isn’t always easy because you have no private life.","Être célèbre n’est pas toujours facile parce qu’on n’a pas de vie privée.","","Infinitive as subject. on n’a pas de = one has no."],
 [500,"Translate into French: Some famous people give money to charity and that is a good example for fans.","Certaines personnes célèbres donnent de l’argent à des associations caritatives et c’est un bon exemple pour les fans.","Certaines personnes célèbres donnent de l’argent à une association caritative et c’est un bon exemple pour les fans.","personnes is feminine, so certaines … célèbres."],
 [500,"Translate into French: If I were famous, I would help poor people.","Si j’étais célèbre, j’aiderais les gens pauvres.","Si j’étais célèbre, j’aiderais les pauvres.","Higher. si + imperfect, then the conditional (aiderais)."],
 [500,"Translate into French: He has been a footballer for ten years and he plays for a big team.","Il est footballeur depuis dix ans et il joue pour une grande équipe.","","Higher. Present + depuis. No article before a job after être. grande agrees with équipe."]
],

travel: [
 [100,"Translate into French: the hotel","l’hôtel","","Masculine; note the circumflex."],
 [100,"What does “la plage” mean in English?","the beach","",""],
 [100,"Translate into French: the ticket","le billet","",""],
 [200,"Translate into French: I would like a double room for two nights.","Je voudrais une chambre double pour deux nuits.","","je voudrais + noun is the polite way to ask for something."],
 [200,"What does “Où est la gare, s’il vous plaît ?” mean?","Where is the station, please?","","gare = railway station."],
 [200,"Translate into French: We are going to stay in a campsite.","Nous allons loger dans un camping.","Nous allons rester dans un camping.","Near future. un camping is masculine."],
 [300,"Give the “nous” form of prendre in the present tense.","nous prenons","","Je prends, tu prends, il prend, nous prenons."],
 [300,"Complete with au, en, à or aux: Je vais ______ Espagne.","en","","Feminine countries use en."],
 [300,"Give the past participle of prendre.","pris","","j’ai pris."],
 [400,"Translate into French: Last summer we visited Paris and we went up the Eiffel Tower.","L’été dernier, nous avons visité Paris et nous sommes montés sur la tour Eiffel.","L’été dernier, nous avons visité Paris et nous avons visité la tour Eiffel.","monter takes être, so the participle agrees: montés. visiter takes avoir."],
 [400,"Translate into French: The weather was lovely and it was sunny every day.","Il faisait beau et il y avait du soleil tous les jours.","Il a fait beau et il y avait du soleil tous les jours.","Weather description uses the imperfect: il faisait beau."],
 [400,"Translate into French: I prefer holidays by the sea because I love swimming.","Je préfère les vacances au bord de la mer parce que j’adore nager.","","vacances is always plural."],
 [500,"Translate into French: Next summer I am going to travel to Spain by plane with my family and we will stay in a hotel near the beach.","L’été prochain, je vais voyager en Espagne en avion avec ma famille et nous logerons dans un hôtel près de la plage.","L’été prochain, je vais voyager en Espagne en avion avec ma famille et nous allons rester dans un hôtel près de la plage.","Near future is fine for both verbs; the simple future (logerons) is Higher."],
 [500,"Translate into French: Unfortunately the train was late and we missed the bus.","Malheureusement, le train était en retard et nous avons raté le bus.","Malheureusement, le train avait du retard et nous avons manqué le bus.","Imperfect for description (était), perfect for the event (avons raté)."],
 [500,"Translate into French: If I could choose, I would go to Canada because I would like to see the mountains.","Si je pouvais choisir, j’irais au Canada parce que je voudrais voir les montagnes.","","Higher. si + imperfect, then the conditional (irais). Canada is masculine, so au."]
],

media: [
 [100,"Translate into French: the mobile phone","le (téléphone) portable","le portable | le téléphone","Masculine."],
 [100,"What does “un réseau social” mean in English?","a social network","",""],
 [100,"Translate into French: the computer","l’ordinateur","","Masculine."],
 [200,"Translate into French: I spend two hours a day on my phone.","Je passe deux heures par jour sur mon portable.","Je passe deux heures par jour sur mon téléphone.","passer + time + sur."],
 [200,"What does “Je joue aux jeux vidéo avec mes amis en ligne” mean?","I play video games online with my friends.","","en ligne = online."],
 [200,"Translate into French: I send messages to my friends.","J’envoie des messages à mes amis.","","envoyer is irregular in the je form."],
 [300,"Give the “nous” form of envoyer in the present tense.","nous envoyons","","The spelling change only affects je / tu / il / ils."],
 [300,"Give the correct form of the verb: Mes parents ne ______ pas utiliser cette appli. (pouvoir)","peuvent","","ils / elles form: peuvent."],
 [300,"Give the plural of “un site web”.","des sites web","","web does not change."],
 [400,"Translate into French: Social media is useful, but it can be dangerous.","Les réseaux sociaux sont utiles, mais ils peuvent être dangereux.","","Plural noun, so plural verb and adjectives. ils peuvent être."],
 [400,"Translate into French: Yesterday I downloaded a new game and I played all evening.","Hier, j’ai téléchargé un nouveau jeu et j’ai joué toute la soirée.","","toute la soirée = all evening."],
 [400,"Translate into French: I never post photos because I want to protect my private life.","Je ne poste jamais de photos parce que je veux protéger ma vie privée.","","ne … jamais + de."],
 [500,"Translate into French: Without technology, my life would be more boring.","Sans la technologie, ma vie serait plus ennuyeuse.","Sans technologie, ma vie serait plus ennuyeuse.","Higher. Conditional of être (serait). ennuyeuse agrees with vie."],
 [500,"Translate into French: I think young people spend too much time online, so they do not talk to their family.","Je pense que les jeunes passent trop de temps en ligne, donc ils ne parlent pas à leur famille.","","trop de temps. leur famille (singular noun, singular leur)."],
 [500,"Translate into French: While watching a series, I often check my phone.","En regardant une série, je regarde souvent mon portable.","Quand je regarde une série, je regarde souvent mon portable.","Higher. en + present participle (regardant) for “while doing”."]
],

environment: [
 [100,"Translate into French: the town","la ville","","Feminine."],
 [100,"What does “le recyclage” mean in English?","recycling","",""],
 [100,"Translate into French: the village","le village","",""],
 [200,"Translate into French: There is a park near my house.","Il y a un parc près de chez moi.","Il y a un parc près de ma maison.","il y a = there is / there are."],
 [200,"What does “Il y a beaucoup de pollution en ville” mean?","There is a lot of pollution in town.","","en ville = in town."],
 [200,"Translate into French: I live in a small town in the north of England.","J’habite dans une petite ville dans le nord de l’Angleterre.","J’habite dans une petite ville au nord de l’Angleterre.","petite goes before the noun and is feminine."],
 [300,"Complete with the correct preposition: Le magasin est ______ la banque et la poste. (between)","entre","",""],
 [300,"Complete: Il n’y a pas ______ cinéma dans mon village.","de","","After a negative, un / une / des / du becomes de."],
 [300,"Give the plural of “un animal”.","des animaux","","-al becomes -aux."],
 [400,"Translate into French: To protect the environment, we must recycle more.","Pour protéger l’environnement, nous devons recycler plus.","Pour protéger l’environnement, il faut recycler plus.","pour + infinitive; devoir or il faut."],
 [400,"Translate into French: In my area there are not enough activities for young people.","Dans mon quartier, il n’y a pas assez d’activités pour les jeunes.","","pas assez de + noun."],
 [400,"Translate into French: I turn off the lights and I go to school by bike.","J’éteins les lumières et je vais au collège à vélo.","J’éteins la lumière et je vais à l’école à vélo.","éteindre is irregular. à vélo (not en vélo)."],
 [500,"Translate into French: Last year they built a new sports centre and it is great for the town.","L’année dernière, on a construit un nouveau centre sportif et c’est super pour la ville.","L’année dernière, ils ont construit un nouveau centre sportif et c’est super pour la ville.","Perfect tense of construire (construit). nouveau goes before the noun."],
 [500,"Translate into French: If we do not act now, the planet will be in danger.","Si nous n’agissons pas maintenant, la planète sera en danger.","Si on n’agit pas maintenant, la planète sera en danger.","Higher. si + present, then the future (sera)."],
 [500,"Translate into French: In the future, I would like to live in the countryside because it is calmer than the city.","Dans le futur, je voudrais habiter à la campagne parce que c’est plus calme que la ville.","À l’avenir, je voudrais habiter à la campagne parce que c’est plus calme que la ville.","plus … que comparison."]
],

"g-verbs": [
 [100,"Give the “je” form of avoir in the present tense.","j’ai","","je becomes j’ before a vowel."],
 [100,"Give the “tu” form of être in the present tense.","tu es","",""],
 [100,"What does “il va” mean in English?","he goes / he is going","","aller + infinitive would make it a near future."],
 [200,"Give the “nous” form of aller in the present tense.","nous allons","",""],
 [200,"Give the past participle of faire.","fait","","j’ai fait."],
 [200,"Put “manger” into the perfect tense with “je”.","j’ai mangé","","avoir + past participle."],
 [300,"Avoir or être? Complete: Elle ______ allée au cinéma.","est (être)","","aller is a verb of movement that takes être; the participle agrees with elle."],
 [300,"Translate into French: I am going to play.","Je vais jouer.","","Near future: aller + infinitive."],
 [300,"Give the “je” form of être in the imperfect tense.","j’étais","","Stem ét- plus -ais."],
 [400,"Translate into French: She went out last night.","Elle est sortie hier soir.","","sortir takes être: the participle agrees, so sortie."],
 [400,"Translate into French: He used to play football every Saturday.","Il jouait au football tous les samedis.","Il jouait au foot chaque samedi.","Imperfect for a repeated habit."],
 [400,"Translate into French: I have just finished my homework.","Je viens de finir mes devoirs.","","Higher. venir de + infinitive = to have just done."],
 [500,"Translate into French: I woke up at seven, I got dressed and I went to school.","Je me suis réveillé(e) à sept heures, je me suis habillé(e) et je suis allé(e) à l’école.","","Reflexive verbs take être in the perfect. The participle agrees with the subject."],
 [500,"Translate into French: Tomorrow I will have a lot of homework.","Demain, j’aurai beaucoup de devoirs.","","Higher. Future of avoir: j’aurai."],
 [500,"Translate into English: Il pleuvait quand nous sommes arrivés.","It was raining when we arrived.","","Imperfect sets the scene (pleuvait); perfect gives the event (sommes arrivés)."]
],

"g-forms": [
 [100,"Give the feminine of “petit”.","petite","",""],
 [100,"Translate into French: a (with a feminine noun)","une","",""],
 [100,"Give the plural of “le gâteau”.","les gâteaux","","-eau nouns add -x."],
 [200,"Give the feminine of “heureux”.","heureuse","","-eux becomes -euse."],
 [200,"Make this negative: Je mange de la viande.","Je ne mange pas de viande.","","ne … pas around the verb; de after the negative."],
 [200,"Translate into French: because","parce que","","Before a vowel: parce qu’."],
 [300,"Complete with à, au, à la or aux: Je vais ______ plage.","à la","","plage is feminine."],
 [300,"Give “my” with the feminine noun “école”.","mon école","","Feminine nouns beginning with a vowel take mon, not ma."],
 [300,"Translate into French: He is taller than me.","Il est plus grand que moi.","","plus + adjective + que. Disjunctive pronoun moi."],
 [400,"Translate into French: a big house","une grande maison","","grand goes before the noun and agrees."],
 [400,"Translate into French: I have no brothers or sisters.","Je n’ai pas de frères ni de sœurs.","Je n’ai ni frère ni sœur. | Je n’ai pas de frères et sœurs.","After a negative: de."],
 [400,"Translate into French: I think that it is very important.","Je pense que c’est très important.","","Never drop que in French."],
 [500,"Translate into French: She says that she does not like her new school.","Elle dit qu’elle n’aime pas sa nouvelle école.","","qu’elle (que + elle). nouvelle is feminine and comes before the noun."],
 [500,"Translate into French: It was raining, but we played football anyway.","Il pleuvait, mais nous avons quand même joué au football.","Il pleuvait mais on a quand même joué au foot.","Imperfect for the background, perfect for the action."],
 [500,"Translate into French: The film that I saw yesterday was excellent.","Le film que j’ai vu hier était excellent.","Le film que j’ai vu hier était génial.","Higher. que introduces the relative clause. vu stays masculine singular because film is masculine singular."]
]
};
