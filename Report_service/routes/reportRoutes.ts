import { Router } from "express";
import { getBotConversationTopicChart } from "../controllers/3getBotConversationTopicChart"
import { getBotConversationHistoryTable } from "../controllers/1getBotConversationHistoryTable";
import { getBotExecutiveSummary } from "../controllers/2getBotExecutiveSummary";
import { getBotConversation } from "../controllers/4getBotConversation";
import { getBotInternalKnowledge } from "../controllers/5getBotInternalKnowledge"
import { updateBotInternalKnowledge } from "../controllers/6updateBotInternalKnowledge"
import { getBotInternalGreeting } from "../controllers/7getBotInternalGreeting"
import { updateBotInternalGreeting } from "../controllers/8updateBotInternalGreeting"


const router = Router();
//1
/* {
    "data": {
      "row_length": Number(rowLength.value),
      "page": currentPage.value,
      "sort_column": 0,
      "direction": "desc",
      "bot_id": queryID.value
    },
    "from_date": Number(dateOfCustom.value.fromDate),
    "to_date": Number(dateOfCustom.value.toDate),
    "search_filter": tempFilter.value.topic,
    "date_mode": Number(tempFilter.value.date)
} */
router.post('/get_bot_conversation_history_table', getBotConversationHistoryTable)
//2
/* {
    "data": {
      "bot_id": queryID.value
    },
    "from_date": Number(dateOfCustom.value.fromDate),
    "to_date": Number(dateOfCustom.value.toDate),
    "date_mode": Number(tempFilter.value.date)
  }
*/

router.post('/get_bot_executive_summary', getBotExecutiveSummary)
//3.
/* 
{
    "data": {
      "bot_id": queryID.value
    },
    "from_date": Number(dateOfCustom.value.fromDate),
    "to_date": Number(dateOfCustom.value.toDate),
    "search_filter": tempFilter.value.topic,
    "date_mode": Number(tempFilter.value.date)
}     
*/

router.post('/get_bot_conversation_topic_chart', getBotConversationTopicChart)
//4
// {
//   job_id: props.jobID.job_id,
// };

router.post('/get_bot_conversation', getBotConversation)
//5
/* {
      bot_id: props.query,
    }
 */
router.post('/get_bot_internal_knowledge', getBotInternalKnowledge)
//6
/* {
      bot_id: props.query,
      child_prompt_id: data.id,
      knowledge_text: data.knowledge_text
    }
 */
router.post('/update_bot_internal_knowledge', updateBotInternalKnowledge)
// 7
/* {
      bot_id: props.query,
    }

 */
router.post('/get_bot_internal_greeting', getBotInternalGreeting)
//8
/* {
      bot_id: props.query,
      greeting: greeting.value
    }
 */
router.post('/update_bot_internal_greeting', updateBotInternalGreeting)

//9
router.post('/-', )






export default router;