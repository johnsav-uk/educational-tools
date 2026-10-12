/* Language Jeopardy: German question bank.
   Same shape as french.js: window.LJ_BANK.german = { <strand key>: [ [pts, question, answer, alternatives, note], ... ] }
   15 questions per strand, three at each of 100-500 in order. Alternatives are separated by " | ".
   Spelling: ß is used throughout; "ss" is accepted in handwritten answers (Fuss, gross) as a marking note.
   Nothing here needs the subjunctive (wäre, hätte, würde forms are left out). */
window.LJ_BANK = window.LJ_BANK || {};
window.LJ_BANK.german = {

identity: [
 [100,"Translate into German: my brother","mein Bruder","","Masculine noun."],
 [100,"Translate into German: my best friend (a girl)","meine beste Freundin","","Both meine and beste take -e with a feminine noun."],
 [100,"What does “die Großeltern” mean in English?","grandparents","","Always plural. Accept Grosseltern."],
 [200,"Translate into German: I get on well with my sister.","Ich verstehe mich gut mit meiner Schwester.","","sich verstehen is reflexive; mit takes the dative, so meiner."],
 [200,"Translate into German: He is tall and he has brown eyes.","Er ist groß und hat braune Augen.","Er ist groß und er hat braune Augen.","Accept gross. Augen is plural, so braune."],
 [200,"What does “Meine Eltern sind geschieden” mean?","My parents are divorced.","",""],
 [300,"Give the “er” form of haben in the present tense.","hat","",""],
 [300,"Complete with the correct possessive: ______ Eltern wohnen in Berlin. (my)","Meine","","Eltern is plural, so meine."],
 [300,"Complete with the correct possessive: Ich verstehe mich gut mit ______ Bruder. (my)","meinem","","mit is followed by the dative: meinem."],
 [400,"Translate into German: My sister is older than me.","Meine Schwester ist älter als ich.","","Comparative with an umlaut: alt → älter. als ich after als."],
 [400,"Translate into German: My best friend (a girl) is funny and kind.","Meine beste Freundin ist lustig und nett.","","Predicative adjectives take no ending."],
 [400,"Translate into German: I don’t see my cousins very often.","Ich sehe meine Cousins nicht sehr oft.","Ich sehe meine Cousinen nicht oft.","sehen: ich sehe. nicht comes before oft."],
 [500,"Translate into German: Last weekend I went out with my friends and we had fun.","Letztes Wochenende bin ich mit meinen Freunden ausgegangen und wir hatten viel Spaß.","Letztes Wochenende bin ich mit meinen Freunden ausgegangen und wir haben viel Spaß gehabt.","Perfect with sein for movement. The separable verb ausgehen puts ge- in the middle of the participle. Inversion after the time phrase."],
 [500,"Translate into German: In the future, I would like to get married and have two children.","In der Zukunft möchte ich heiraten und zwei Kinder haben.","In Zukunft möchte ich heiraten und zwei Kinder haben.","möchte + infinitive at the end of the clause."],
 [500,"Translate into German: My parents have been married for twenty years.","Meine Eltern sind seit zwanzig Jahren verheiratet.","","Higher. seit + dative with the present tense. Jahren has the dative plural -n."]
],

healthy: [
 [100,"Translate into German: breakfast","das Frühstück","","Neuter."],
 [100,"What does “das Gemüse” mean in English?","vegetables","","Singular in German."],
 [100,"Translate into German: water","das Wasser","","Neuter."],
 [200,"Translate into German: I have a headache.","Ich habe Kopfschmerzen.","Mein Kopf tut weh. | Ich habe Kopfweh.","Kopfschmerzen is a plural noun with no article."],
 [200,"Translate into German: I eat fruit every day.","Ich esse jeden Tag Obst.","Jeden Tag esse ich Obst.","essen: ich esse. Obst needs no article."],
 [200,"What does “Man muss acht Stunden schlafen” mean?","You must / one must sleep eight hours.","People must sleep eight hours.","man = one / you / people."],
 [300,"Give the “er” form of essen in the present tense.","isst","","Vowel change e → i."],
 [300,"Give the “du” form of schlafen in the present tense.","schläfst","","Vowel change a → ä."],
 [300,"Complete with kein, keine or keinen: Ich esse ______ Fleisch. (no meat)","kein","","Fleisch is neuter."],
 [400,"Translate into German: I don’t smoke because it is bad for your health.","Ich rauche nicht, weil es ungesund ist.","Ich rauche nicht, weil es schlecht für die Gesundheit ist.","weil sends the verb to the end of its clause."],
 [400,"Translate into German: Yesterday I ate too much chocolate.","Gestern habe ich zu viel Schokolade gegessen.","","Perfect tense: habe … gegessen. The time word comes first, so habe goes before ich."],
 [400,"Translate into German: I do sport three times a week to stay fit.","Ich treibe dreimal pro Woche Sport, um fit zu bleiben.","Ich mache dreimal in der Woche Sport, um fit zu bleiben.","um … zu + infinitive for “in order to”."],
 [500,"Translate into German: To be healthier, I am going to eat less sugar and drink more water.","Um gesünder zu sein, werde ich weniger Zucker essen und mehr Wasser trinken.","Um gesünder zu sein, will ich weniger Zucker essen und mehr Wasser trinken.","Future: werden + infinitive at the end. After the um … zu clause, the verb comes first in the main clause."],
 [500,"Translate into German: When I was younger, I ate a lot of sweets.","Als ich jünger war, aß ich viele Süßigkeiten.","Als ich jünger war, habe ich viele Süßigkeiten gegessen.","als for a single past occasion or period; the verb war goes to the end. Accept ss for ß."],
 [500,"Translate into German: I will do more sport if I have time.","Ich werde mehr Sport treiben, wenn ich Zeit habe.","Ich werde mehr Sport machen, wenn ich Zeit habe.","Higher. wenn sends habe to the end."]
],

education: [
 [100,"Translate into German: homework","die Hausaufgaben","","Plural in German."],
 [100,"What does “die Kantine” mean in English?","the canteen","",""],
 [100,"What does “die Krankenschwester” mean in English?","(female) nurse","nurse",""],
 [200,"Translate into German: My favourite subject is history.","Mein Lieblingsfach ist Geschichte.","","Subjects take no article after ist."],
 [200,"Translate into German: We have lessons from half past eight until four o’clock.","Wir haben von halb neun bis vier Uhr Unterricht.","Wir haben von halb neun bis sechzehn Uhr Unterricht.","halb neun = half past eight (half way to nine)."],
 [200,"What does “Ich bin schlecht in Mathe” mean?","I’m bad at maths.","",""],
 [300,"Give the feminine of “der Schauspieler”.","die Schauspielerin","","Add -in."],
 [300,"Complete with dem or den: Ich fahre mit ______ Bus zur Schule.","dem","","mit always takes the dative; Bus is masculine."],
 [300,"Give the “wir” form of müssen in the present tense.","müssen","","The wir form is the same as the infinitive."],
 [400,"Translate into German: I think school uniform is useless because everyone looks the same.","Ich finde Schuluniform nutzlos, weil alle gleich aussehen.","Ich denke, dass die Schuluniform nutzlos ist, weil alle gleich aussehen.","weil sends the verb to the end. aussehen is not split in a subordinate clause."],
 [400,"Translate into German: Last year I studied Spanish and I passed my exam.","Letztes Jahr habe ich Spanisch gelernt und meine Prüfung bestanden.","Letztes Jahr habe ich Spanisch gelernt und die Prüfung bestanden.","One habe serves both participles; Prüfung is feminine."],
 [400,"Translate into German: My mother works in a bank and my father is a mechanic.","Meine Mutter arbeitet in einer Bank und mein Vater ist Mechaniker.","","No article before a job after ist. in + dative: in einer Bank."],
 [500,"Translate into German: After my exams I want to study science because I would like to become a doctor.","Nach meinen Prüfungen möchte ich Naturwissenschaften studieren, weil ich Arzt werden möchte.","Nach meinen Prüfungen möchte ich Naturwissenschaften studieren, weil ich Ärztin werden möchte.","nach + dative plural: meinen Prüfungen. In the weil clause the verbs go to the end: werden möchte."],
 [500,"Translate into German: In the future, I will work in a hospital because I like helping people.","In der Zukunft werde ich in einem Krankenhaus arbeiten, weil ich gern Menschen helfe.","In der Zukunft werde ich in einem Krankenhaus arbeiten, weil es mir Spaß macht, Menschen zu helfen.","Higher. helfen takes the dative, but Menschen has no extra ending in the plural."],
 [500,"Translate into German: I have been learning German for five years.","Ich lerne seit fünf Jahren Deutsch.","","Higher. seit + dative + present tense, NOT the perfect tense."]
],

freetime: [
 [100,"Translate into German: to play football","Fußball spielen","Fussball spielen","No article."],
 [100,"What does “das Schwimmen” mean in English?","swimming","",""],
 [100,"Translate into German: the film","der Film","","Masculine."],
 [200,"Translate into German: I play the guitar.","Ich spiele Gitarre.","Ich spiele die Gitarre.","Both are accepted; the form without an article is more common."],
 [200,"Translate into German: I like going to the cinema with my friends.","Ich gehe gern mit meinen Freunden ins Kino.","Ich gehe gern ins Kino mit meinen Freunden.","gern after the verb. ins = in das."],
 [200,"What does “Ich sehe überhaupt nicht gern fern” mean?","I don’t like watching TV at all.","","fernsehen is separable: sehe … fern."],
 [300,"Give the “du” form of fahren in the present tense.","fährst","","Vowel change a → ä."],
 [300,"Complete: Ich gehe ______ Kino. (in + das)","ins","","Kino is neuter."],
 [300,"Complete with the correct form of sehen: Er ______ gern Filme.","sieht","","Vowel change e → ie."],
 [400,"Translate into German: On Saturdays I usually go swimming and then I watch a film.","Samstags gehe ich normalerweise schwimmen und dann sehe ich einen Film.","Samstags gehe ich meistens schwimmen und danach sehe ich einen Film.","Verb second after the time word. Film is masculine: einen in the accusative."],
 [400,"Translate into German: Last weekend I went to a concert with my cousin.","Letztes Wochenende bin ich mit meinem Cousin zu einem Konzert gegangen.","Letztes Wochenende bin ich mit meiner Cousine ins Konzert gegangen.","Perfect with sein: bin … gegangen. mit takes the dative."],
 [400,"Translate into German: My favourite sport is rugby because it is exciting.","Mein Lieblingssport ist Rugby, weil es spannend ist.","","The verb ist goes to the end after weil."],
 [500,"Translate into German: If it rains this weekend, I will stay at home and read a book.","Wenn es dieses Wochenende regnet, bleibe ich zu Hause und lese ein Buch.","Wenn es dieses Wochenende regnet, werde ich zu Hause bleiben und ein Buch lesen.","wenn clause first, so the verb comes straight after the comma: bleibe ich."],
 [500,"Translate into German: When I was little, I played in the garden every day.","Als ich klein war, habe ich jeden Tag im Garten gespielt.","Als ich klein war, spielte ich jeden Tag im Garten.","als + war at the end. im = in dem."],
 [500,"Translate into German: I would like to learn to play the drums because I love music.","Ich möchte Schlagzeug spielen lernen, weil ich Musik liebe.","Ich möchte Schlagzeug spielen lernen, weil ich Musik toll finde.","möchte + infinitives at the end. weil sends liebe to the end."]
],

customs: [
 [100,"Translate into German: Christmas","Weihnachten","","Used without an article, and is a plural-looking neuter noun."],
 [100,"What does “das Feuerwerk” mean in English?","fireworks / a firework display","",""],
 [100,"Translate into German: the birthday","der Geburtstag","","Masculine."],
 [200,"Translate into German: We celebrate Christmas with the family.","Wir feiern Weihnachten mit der Familie.","Wir feiern Weihnachten mit unserer Familie.","mit + dative: der Familie."],
 [200,"Translate into German: On New Year’s Eve there is a big party.","An Silvester gibt es eine große Party.","Zu Silvester gibt es eine große Party.","es gibt + accusative: eine große Party."],
 [200,"What does “Man schenkt Geschenke” mean?","People give presents.","You give presents.","man = people in general."],
 [300,"Give the plural of “das Geschenk”.","die Geschenke","",""],
 [300,"Complete with the correct form of feiern: Wir ______ den Geburtstag meiner Oma.","feiern","","wir form = infinitive."],
 [300,"Complete with the correct article: ______ Weihnachtsmarkt ist sehr schön.","Der","","Markt is masculine."],
 [400,"Translate into German: Last Christmas we ate goose and played games.","Letzte Weihnachten haben wir Gans gegessen und Spiele gespielt.","Letztes Weihnachten haben wir Gans gegessen und Spiele gespielt.","Perfect tense: haben … gegessen und gespielt. Inversion after the time phrase."],
 [400,"Translate into German: In my family we do not celebrate Easter, but we celebrate Eid.","In meiner Familie feiern wir Ostern nicht, aber wir feiern Eid.","In meiner Familie feiern wir nicht Ostern, aber wir feiern Eid.","in + dative: meiner Familie. Ostern is used without an article."],
 [400,"Translate into German: I think festivals are important because they bring people together.","Ich finde Feste wichtig, weil sie Menschen zusammenbringen.","Ich denke, dass Feste wichtig sind, weil sie Menschen zusammenbringen.","weil sends the verb to the end."],
 [500,"Translate into German: Next year I am going to spend New Year’s Eve in Berlin with my friends.","Nächstes Jahr werde ich Silvester mit meinen Freunden in Berlin verbringen.","Nächstes Jahr verbringe ich Silvester mit meinen Freunden in Berlin.","Future with werden + infinitive at the end, or the present tense with a future time phrase."],
 [500,"Translate into German: At the carnival, people wore costumes and danced in the streets.","Beim Karneval trugen die Leute Kostüme und tanzten auf den Straßen.","Beim Karneval haben die Leute Kostüme getragen und auf den Straßen getanzt.","beim = bei dem. auf den Straßen is dative plural."],
 [500,"Translate into German: My favourite festival is Oktoberfest because there is music and a lot of people there.","Mein Lieblingsfest ist das Oktoberfest, weil es dort Musik und viele Leute gibt.","Das Fest, das mir am besten gefällt, ist das Oktoberfest, weil es Musik und viele Leute gibt.","es gibt moves to the end after weil: gibt."]
],

celebrity: [
 [100,"Translate into German: the singer (a woman)","die Sängerin","","Add -in; the umlaut stays."],
 [100,"What does “berühmt” mean in English?","famous","",""],
 [100,"Translate into German: the fan (a man)","der Fan","",""],
 [200,"Translate into German: He is a famous actor.","Er ist ein berühmter Schauspieler.","Er ist Schauspieler und berühmt.","The adjective before the noun takes an ending: ein berühmter Schauspieler."],
 [200,"What does “Sie verdient viel Geld” mean?","She earns a lot of money.","",""],
 [200,"Translate into German: I admire this sportsman.","Ich bewundere diesen Sportler.","","Masculine accusative: diesen."],
 [300,"Give the feminine of “der Sänger”.","die Sängerin","",""],
 [300,"Does “berühmt” take an ending in: Diese Sängerin ist berühmt. Yes or no?","No","","Adjectives after sein take no ending."],
 [300,"Give the past participle of sehen.","gesehen","","Perfect with haben: ich habe gesehen."],
 [400,"Translate into German: I think celebrities have too much influence on young people.","Ich denke, dass Prominente zu viel Einfluss auf junge Leute haben.","Ich denke, dass Prominente zu viel Einfluss auf Jugendliche haben.","dass sends haben to the end."],
 [400,"Translate into German: Last year I saw my favourite singer in concert.","Letztes Jahr habe ich meinen Lieblingssänger im Konzert gesehen.","Letztes Jahr habe ich meine Lieblingssängerin im Konzert gesehen.","Accusative: meinen / meine. im = in dem."],
 [400,"Translate into German: Being famous isn’t always easy because you have no private life.","Berühmt zu sein ist nicht immer einfach, weil man kein Privatleben hat.","","kein + neuter noun. hat goes to the end after weil."],
 [500,"Translate into German: Some famous people give money to charity and that is a good example for fans.","Einige Prominente geben Geld für wohltätige Zwecke, und das ist ein gutes Beispiel für die Fans.","Einige Prominente spenden Geld, und das ist ein gutes Beispiel für die Fans.","für + accusative. Beispiel is neuter, so ein gutes."],
 [500,"Translate into German: If I am famous one day, I will help poor people.","Wenn ich eines Tages berühmt bin, werde ich armen Menschen helfen.","","Higher. wenn clause first, then the verb straight after the comma. helfen takes the dative: armen Menschen."],
 [500,"Translate into German: He has been a footballer for ten years and plays for a big team.","Er ist seit zehn Jahren Fußballspieler und spielt für eine große Mannschaft.","Er ist seit zehn Jahren Fußballer und spielt für eine große Mannschaft.","Higher. seit + dative with the present tense. für + accusative; Mannschaft is feminine."]
],

travel: [
 [100,"Translate into German: the hotel","das Hotel","","Neuter."],
 [100,"What does “der Strand” mean in English?","the beach","",""],
 [100,"Translate into German: the ticket (for a train)","die Fahrkarte","","Accept das Ticket."],
 [200,"Translate into German: I would like a double room for two nights.","Ich möchte ein Doppelzimmer für zwei Nächte.","Ich hätte gern ein Doppelzimmer für zwei Nächte.","Nacht → Nächte (umlaut plural)."],
 [200,"What does “Wo ist der Bahnhof, bitte?” mean?","Where is the station, please?","",""],
 [200,"Translate into German: We are going to stay on a campsite.","Wir werden auf einem Campingplatz übernachten.","Wir übernachten auf einem Campingplatz.","werden + infinitive at the end, or the present tense."],
 [300,"Give the past participle of fahren.","gefahren","","Perfect with sein."],
 [300,"Give the “ich” form of nehmen in the present tense.","nehme","",""],
 [300,"Haben or sein? Complete: Wir ______ nach Spanien gefahren.","sind (sein)","","Verbs of movement take sein in the perfect tense."],
 [400,"Translate into German: Last summer we visited Berlin and went swimming every day.","Letzten Sommer haben wir Berlin besucht und sind jeden Tag schwimmen gegangen.","Letzten Sommer haben wir Berlin besucht und sind jeden Tag schwimmen gegangen.","Two auxiliaries: haben for besuchen, sein for gehen. Time phrase first, then verb second."],
 [400,"Translate into German: The weather was lovely and it was sunny every day.","Das Wetter war schön und es war jeden Tag sonnig.","Das Wetter war schön und die Sonne schien jeden Tag.","Imperfect of sein: war."],
 [400,"Translate into German: I prefer holidays by the sea because I like swimming.","Ich mache lieber Urlaub am Meer, weil ich gern schwimme.","Ich bevorzuge Urlaub am Meer, weil ich gern schwimme.","lieber = rather / prefer. am = an dem. schwimme goes to the end."],
 [500,"Translate into German: Next summer I am going to travel to Spain by plane with my family and we will stay in a hotel near the beach.","Nächsten Sommer werde ich mit meiner Familie mit dem Flugzeug nach Spanien reisen und wir werden in einem Hotel in der Nähe vom Strand übernachten.","Nächsten Sommer reise ich mit meiner Familie mit dem Flugzeug nach Spanien und wir übernachten in einem Hotel am Strand.","Both werden + infinitive and present-for-future are fine. mit + dative."],
 [500,"Translate into German: Unfortunately the train was late and we missed the bus.","Leider hatte der Zug Verspätung und wir haben den Bus verpasst.","Leider war der Zug zu spät und wir haben den Bus verpasst.","hatte Verspätung is the usual way to say a train is late. Accusative den Bus."],
 [500,"Translate into German: If I have enough money, I will travel to Peru next year.","Wenn ich genug Geld habe, werde ich nächstes Jahr nach Peru reisen.","Wenn ich genug Geld habe, reise ich nächstes Jahr nach Peru.","Higher. wenn clause first, so werde follows the comma."]
],

media: [
 [100,"Translate into German: the mobile phone","das Handy","das Mobiltelefon","Neuter."],
 [100,"What does “das soziale Netzwerk” mean in English?","the social network","",""],
 [100,"Translate into German: the computer","der Computer","der Rechner","Masculine."],
 [200,"Translate into German: I spend two hours a day on my phone.","Ich verbringe zwei Stunden pro Tag an meinem Handy.","Ich verbringe zwei Stunden am Tag auf meinem Handy.","Stunden is plural; dative after an / auf here."],
 [200,"What does “Ich spiele online Videospiele mit meinen Freunden” mean?","I play video games online with my friends.","",""],
 [200,"Translate into German: I send messages to my friends.","Ich schicke meinen Freunden Nachrichten.","Ich sende Nachrichten an meine Freunde.","Dative for the person receiving: meinen Freunden."],
 [300,"Give the plural of “die Nachricht”.","die Nachrichten","",""],
 [300,"Give the “er” form of können in the present tense.","kann","","Irregular: ich kann, du kannst, er kann."],
 [300,"Give the plural of “das Spiel”.","die Spiele","",""],
 [400,"Translate into German: Social media is useful, but it can be dangerous.","Soziale Medien sind nützlich, aber sie können gefährlich sein.","Social Media ist nützlich, aber es kann gefährlich sein.","Modal verb in position two, the infinitive sein at the end."],
 [400,"Translate into German: Yesterday I downloaded a new game and played all evening.","Gestern habe ich ein neues Spiel heruntergeladen und den ganzen Abend gespielt.","","herunterladen is separable: the participle is heruntergeladen. den ganzen Abend is accusative."],
 [400,"Translate into German: I never post photos because I want to protect my private life.","Ich poste nie Fotos, weil ich mein Privatleben schützen möchte.","Ich poste nie Fotos, weil ich mein Privatleben schützen will.","The modal and infinitive both go to the end after weil."],
 [500,"Translate into German: Technology makes my life easier, but it is also expensive.","Technologie macht mein Leben einfacher, aber sie ist auch teuer.","Die Technik macht mein Leben einfacher, aber sie ist auch teuer.","Comparative einfacher (adjective + -er)."],
 [500,"Translate into German: I think young people spend too much time online, so they do not talk to their family.","Ich denke, dass junge Leute zu viel Zeit online verbringen, deshalb sprechen sie nicht mit ihrer Familie.","Ich denke, dass junge Leute zu viel Zeit online verbringen, deshalb reden sie nicht mit ihrer Familie.","dass sends verbringen to the end. After deshalb the verb comes next: deshalb sprechen sie."],
 [500,"Translate into German: While I watch a series, I often look at my phone.","Während ich eine Serie sehe, schaue ich oft auf mein Handy.","Während ich eine Serie schaue, schaue ich oft auf mein Handy.","während clause first: verb at the end, then the main clause verb comes straight after the comma."]
],

environment: [
 [100,"Translate into German: the town","die Stadt","","Feminine."],
 [100,"What does “das Recycling” mean in English?","recycling","",""],
 [100,"Translate into German: the village","das Dorf","","Neuter."],
 [200,"Translate into German: There is a park near my house.","Es gibt einen Park in der Nähe von meinem Haus.","Es gibt einen Park in der Nähe meines Hauses.","es gibt + accusative: einen Park."],
 [200,"What does “Es gibt viel Umweltverschmutzung in der Stadt” mean?","There is a lot of pollution in the town.","",""],
 [200,"Translate into German: I live in a small town in the north of England.","Ich wohne in einer kleinen Stadt im Norden von England.","Ich wohne in einer kleinen Stadt im Norden Englands.","in + dative: einer kleinen Stadt."],
 [300,"Complete with the correct word: Das Geschäft ist ______ der Bank und der Post. (between)","zwischen","",""],
 [300,"Complete with kein, keine or keinen: Es gibt ______ Kino in meinem Dorf.","kein","","Kino is neuter."],
 [300,"Give the plural of “das Tier”.","die Tiere","",""],
 [400,"Translate into German: To protect the environment, we must recycle more.","Um die Umwelt zu schützen, müssen wir mehr recyceln.","Um die Umwelt zu schützen, müssen wir mehr recyclen.","um … zu clause first, so the verb müssen comes next."],
 [400,"Translate into German: In my area there aren’t enough activities for young people.","In meiner Gegend gibt es nicht genug Aktivitäten für junge Leute.","In meiner Gegend gibt es nicht genug Aktivitäten für Jugendliche.","in + dative: meiner Gegend. für + accusative."],
 [400,"Translate into German: I turn off the light and go to school by bike.","Ich schalte das Licht aus und fahre mit dem Fahrrad zur Schule.","Ich mache das Licht aus und fahre mit dem Rad zur Schule.","ausschalten is separable: schalte … aus. mit + dative: dem Fahrrad. zur = zu der."],
 [500,"Translate into German: Last year they built a new sports centre and it is great for the town.","Letztes Jahr hat man ein neues Sportzentrum gebaut und es ist toll für die Stadt.","Letztes Jahr haben sie ein neues Sportzentrum gebaut und es ist toll für die Stadt.","Perfect tense: hat … gebaut. Neuter accusative: ein neues Sportzentrum."],
 [500,"Translate into German: If we do not act now, the planet will be in danger.","Wenn wir jetzt nicht handeln, wird der Planet in Gefahr sein.","Wenn wir nicht jetzt handeln, wird der Planet in Gefahr sein.","Higher. wenn clause first: handeln at the end, then wird straight after the comma."],
 [500,"Translate into German: In the future I would like to live in the countryside because it is calmer than the city.","In der Zukunft möchte ich auf dem Land wohnen, weil es ruhiger ist als in der Stadt.","In der Zukunft möchte ich auf dem Land wohnen, weil es ruhiger als die Stadt ist.","Comparative ruhiger + als. auf dem Land = in the countryside."]
],

"g-verbs": [
 [100,"Give the “ich” form of haben in the present tense.","habe","","Also accept hab."],
 [100,"Give the “du” form of sein in the present tense.","bist","",""],
 [100,"What does “er geht” mean in English?","he goes / he is going","",""],
 [200,"Give the “wir” form of fahren in the present tense.","fahren","","No vowel change in the wir form."],
 [200,"Give the past participle of machen.","gemacht","","Regular: ge- + stem + -t."],
 [200,"Put “spielen” into the perfect tense with “ich”.","ich habe gespielt","","haben + past participle at the end."],
 [300,"Haben or sein? Complete: Sie ______ nach Hause gegangen.","ist (sein)","","gehen is a movement verb, so sein."],
 [300,"Translate into German using werden: I will play.","Ich werde spielen.","","werden + infinitive at the end."],
 [300,"Give the “ich” form of sein in the simple past (imperfect).","war","","ich war, du warst, er war."],
 [400,"Translate into German: She went out last night.","Sie ist gestern Abend ausgegangen.","Gestern Abend ist sie ausgegangen.","Perfect with sein. Separable verb: ge- goes in the middle of the participle."],
 [400,"Translate into German: He played football every Saturday.","Er spielte jeden Samstag Fußball.","Er hat jeden Samstag Fußball gespielt.","Imperfect (spielte) or perfect both work."],
 [400,"Translate into German: I have just finished my homework.","Ich habe gerade meine Hausaufgaben fertig gemacht.","Ich habe gerade meine Hausaufgaben beendet.","gerade = just. Participle goes at the end."],
 [500,"Translate into German: I woke up at seven, got dressed and went to school.","Ich bin um sieben Uhr aufgewacht, habe mich angezogen und bin zur Schule gegangen.","","aufwachen takes sein; sich anziehen takes haben. Two auxiliaries in one sentence."],
 [500,"Translate into German: Tomorrow I will have a lot of homework.","Morgen werde ich viele Hausaufgaben haben.","Morgen habe ich viele Hausaufgaben.","The present tense with a time word is also fine."],
 [500,"Translate into English: Es regnete, als wir ankamen.","It was raining when we arrived.","","regnete sets the scene; ankamen is the event."]
],

"g-forms": [
 [100,"Give the plural of “der Hund”.","die Hunde","",""],
 [100,"Translate into German: a (with a feminine noun)","eine","",""],
 [100,"Give the plural of “das Buch”.","die Bücher","","Umlaut plus -er."],
 [200,"Which type of word always starts with a capital letter in German?","nouns","Nomen | Substantive",""],
 [200,"Make this negative: Ich esse Fleisch.","Ich esse kein Fleisch.","","kein negates a noun without an article or with ein."],
 [200,"Translate into German (the word that sends the verb to the end): because","weil","","Also accept denn, with a note: denn does not send the verb to the end."],
 [300,"Complete: Ich gehe ______ Strand. (zu + dem)","zum","","Strand is masculine."],
 [300,"Give “my” with the feminine noun “Schwester” in the nominative.","meine","",""],
 [300,"Translate into German: He is taller than me.","Er ist größer als ich.","","groß → größer; als ich."],
 [400,"Translate into German: a big house","ein großes Haus","","Neuter singular after ein: -es ending."],
 [400,"Translate into German: I have no brothers or sisters.","Ich habe keine Geschwister.","","Geschwister (plural) covers brothers and sisters."],
 [400,"Translate into German: I think that it is very important.","Ich denke, dass es sehr wichtig ist.","Ich finde es sehr wichtig.","dass sends ist to the end."],
 [500,"Translate into German: She says that she does not like her new school.","Sie sagt, dass sie ihre neue Schule nicht mag.","","dass clause: verb last. ihre neue Schule is feminine accusative."],
 [500,"Translate into German: It rained, but we played football anyway.","Es hat geregnet, aber wir haben trotzdem Fußball gespielt.","Es regnete, aber wir haben trotzdem Fußball gespielt.","trotzdem = anyway; the verb follows it."],
 [500,"Translate into German: The film that I saw yesterday was excellent.","Der Film, den ich gestern gesehen habe, war ausgezeichnet.","Der Film, den ich gestern gesehen habe, war toll.","Higher. Relative pronoun den (masculine accusative); the verb goes to the end of the relative clause."]
]
};
