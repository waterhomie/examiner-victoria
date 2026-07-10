"""Curated IELTS Speaking question bank used by the Streamlit app."""

from pdf_recall_question_bank import (
    PART1_STUDY_QUESTIONS,
    PART1_WORK_QUESTIONS,
    PDF_CUE_CARDS,
    PDF_PART1_SECONDARY_TOPICS,
)

PART1_SECONDARY_TOPICS = PDF_PART1_SECONDARY_TOPICS


EXTRA_CUE_CARDS = [
    {
        "title": "a memorable journey",
        "prompt": (
            "Describe a memorable journey you have taken.\n\n"
            "You should say:\n- where you went\n- how you travelled\n"
            "- who you went with\n- and explain why the journey was memorable"
        ),
        "follow_up": "Would you like to take the same journey again?",
        "part3": [
            "Why do people enjoy travelling?",
            "How has tourism changed in recent years?",
            "What problems can mass tourism cause?",
            "How might people travel differently in the future?",
        ],
    },
    {
        "title": "a useful object",
        "prompt": (
            "Describe an object that you use often.\n\n"
            "You should say:\n- what it is\n- when you got it\n"
            "- how you use it\n- and explain why it is useful"
        ),
        "follow_up": "Would it be difficult for you to live without this object?",
        "part3": [
            "Why do people buy things they do not really need?",
            "How does advertising influence what people buy?",
            "Are modern products designed to last long enough?",
            "Will people own fewer physical objects in the future?",
        ],
    },
    {
        "title": "an interesting book",
        "prompt": (
            "Describe a book that you found interesting.\n\n"
            "You should say:\n- what the book was\n- when you read it\n"
            "- what it was about\n- and explain why you found it interesting"
        ),
        "follow_up": "Would you recommend this book to other people?",
        "part3": [
            "Why do some people read more than others?",
            "Should children be encouraged to read printed books?",
            "How have digital devices changed reading habits?",
            "What kinds of books might remain popular in the future?",
        ],
    },
    {
        "title": "a film you enjoyed",
        "prompt": (
            "Describe a film that you enjoyed watching.\n\n"
            "You should say:\n- what the film was\n- when you watched it\n"
            "- what happened in it\n- and explain why you enjoyed it"
        ),
        "follow_up": "Would you watch this film again?",
        "part3": [
            "Why are films an important form of entertainment?",
            "Do films influence people's attitudes and behaviour?",
            "What makes a film successful internationally?",
            "How might cinemas change in the future?",
        ],
    },
    {
        "title": "a public place",
        "prompt": (
            "Describe a public place that you enjoy visiting.\n\n"
            "You should say:\n- where it is\n- what it looks like\n"
            "- what people do there\n- and explain why you enjoy visiting it"
        ),
        "follow_up": "How often do you visit this place?",
        "part3": [
            "Why do cities need good public spaces?",
            "What makes a public place feel safe?",
            "Should governments spend more money on parks or buildings?",
            "How will public spaces change as cities become more crowded?",
        ],
    },
    {
        "title": "a celebration",
        "prompt": (
            "Describe a celebration that you enjoyed.\n\n"
            "You should say:\n- what was celebrated\n- where it took place\n"
            "- who was there\n- and explain why you enjoyed it"
        ),
        "follow_up": "Would you celebrate it in the same way again?",
        "part3": [
            "Why are celebrations important to communities?",
            "How are traditional celebrations changing?",
            "Do commercial interests have too much influence on festivals?",
            "Will national celebrations remain important in the future?",
        ],
    },
    {
        "title": "a difficult decision",
        "prompt": (
            "Describe a difficult decision that you made.\n\n"
            "You should say:\n- what the decision was\n- when you made it\n"
            "- who helped you\n- and explain why it was difficult"
        ),
        "follow_up": "Do you think you made the right decision?",
        "part3": [
            "Why do some people find decisions difficult?",
            "Should young people ask others for advice before deciding?",
            "Are important decisions easier when people have more information?",
            "How might technology influence decision-making in the future?",
        ],
    },
    {
        "title": "a time you helped someone",
        "prompt": (
            "Describe a time when you helped someone.\n\n"
            "You should say:\n- who you helped\n- what the problem was\n"
            "- what you did\n- and explain how you felt afterwards"
        ),
        "follow_up": "Would you help this person again?",
        "part3": [
            "Why are some people more willing to help than others?",
            "Should schools require students to do volunteer work?",
            "What kinds of help do older people need?",
            "Has technology made people more or less helpful?",
        ],
    },
    {
        "title": "an outdoor activity",
        "prompt": (
            "Describe an outdoor activity that you enjoy.\n\n"
            "You should say:\n- what the activity is\n- where you do it\n"
            "- who you do it with\n- and explain why you enjoy it"
        ),
        "follow_up": "Would you like to do this activity more often?",
        "part3": [
            "Why do some people prefer indoor activities?",
            "How can cities encourage people to spend time outdoors?",
            "Should outdoor education be part of the school curriculum?",
            "Will people spend less time outdoors in the future?",
        ],
    },
    {
        "title": "a helpful technology",
        "prompt": (
            "Describe a piece of technology that is helpful to you.\n\n"
            "You should say:\n- what it is\n- when you started using it\n"
            "- how it helps you\n- and explain how it has changed your life"
        ),
        "follow_up": "Would you replace it with a newer version?",
        "part3": [
            "What technologies have had the greatest impact on daily life?",
            "Do people rely too much on technology?",
            "Should everyone have equal access to new technology?",
            "What new technology might become common in the future?",
        ],
    },
    {
        "title": "a favourite photograph",
        "prompt": (
            "Describe a photograph that is important to you.\n\n"
            "You should say:\n- what is shown in the photograph\n- when it was taken\n"
            "- who took it\n- and explain why it is important to you"
        ),
        "follow_up": "Where do you keep this photograph?",
        "part3": [
            "Why do people like taking photographs?",
            "Has social media changed the value of photographs?",
            "Is professional photography still important?",
            "How might people record memories in the future?",
        ],
    },
    {
        "title": "a traditional food",
        "prompt": (
            "Describe a traditional food from your country.\n\n"
            "You should say:\n- what it is\n- what it is made from\n"
            "- when people eat it\n- and explain why it is popular"
        ),
        "follow_up": "Can you prepare this food yourself?",
        "part3": [
            "Why is traditional food important to a culture?",
            "How are people's diets changing?",
            "Should governments encourage healthier eating?",
            "Will traditional dishes remain popular in the future?",
        ],
    },
    {
        "title": "an important goal",
        "prompt": (
            "Describe an important goal that you hope to achieve.\n\n"
            "You should say:\n- what the goal is\n- when you set it\n"
            "- what you need to do\n- and explain why it is important to you"
        ),
        "follow_up": "How confident are you that you will achieve this goal?",
        "part3": [
            "Why is it useful to set goals?",
            "Do young and older people usually have different goals?",
            "How can people remain motivated when progress is slow?",
            "Does modern society place too much emphasis on achievement?",
        ],
    },
    {
        "title": "a crowded place",
        "prompt": (
            "Describe a crowded place that you have visited.\n\n"
            "You should say:\n- where it was\n- when you went there\n"
            "- why it was crowded\n- and explain how you felt there"
        ),
        "follow_up": "Would you visit this place again at a quieter time?",
        "part3": [
            "Why are some cities becoming increasingly crowded?",
            "What problems does overcrowding create?",
            "How can public transport reduce congestion?",
            "Will more people move away from large cities in the future?",
        ],
    },
    {
        "title": "useful advice",
        "prompt": (
            "Describe some useful advice that you received.\n\n"
            "You should say:\n- what the advice was\n- who gave it to you\n"
            "- when you received it\n- and explain why it was useful"
        ),
        "follow_up": "Have you shared this advice with anyone else?",
        "part3": [
            "Why do people sometimes ignore good advice?",
            "Who should young people ask for advice?",
            "Is professional advice always better than advice from friends?",
            "Will artificial intelligence become a common source of advice?",
        ],
    },
    {
        "title": "interesting news",
        "prompt": (
            "Describe a piece of news that interested you.\n\n"
            "You should say:\n- what the news was about\n- where you heard it\n"
            "- who was involved\n- and explain why it interested you"
        ),
        "follow_up": "Did you discuss this news with anyone?",
        "part3": [
            "Why do people follow the news?",
            "How can people identify unreliable news?",
            "Should news organisations focus more on positive stories?",
            "How will people receive news in the future?",
        ],
    },
    {
        "title": "a beautiful natural place",
        "prompt": (
            "Describe a beautiful natural place that you have visited.\n\n"
            "You should say:\n- where it is\n- what you saw there\n"
            "- what you did there\n- and explain why you found it beautiful"
        ),
        "follow_up": "Would you recommend this place to other visitors?",
        "part3": [
            "Why are natural places important to people?",
            "What damage can tourism cause to the environment?",
            "Who should pay for protecting natural areas?",
            "How can children be encouraged to care about nature?",
        ],
    },
]


# Candidate-recall cards from the scanned May-August PDF are kept in a separate
# source module so the extraction can be audited and refreshed independently.
EXTRA_CUE_CARDS.extend(PDF_CUE_CARDS)
