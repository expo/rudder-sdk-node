import test from 'ava';
import auth from 'basic-auth';
import bodyParser from 'body-parser';
import delay from 'delay';
import express from 'express';
import { spy, stub } from 'sinon';

import Analytics from '.';
import { version } from './package.json';

const noop = () => {};

const context = {
  library: {
    name: '@expo/rudder-sdk-node',
    version,
  },
};

const metadata = { nodeVersion: process.versions.node };
const host = 'http://localhost';
const port = 4063;

// 32768 bytes (~32.7kb)
const largeText =
  'Sed in soluta nam sit. Minus sunt sed aliquid aliquam aut ipsum voluptatem. Et magni ut quaerat corporis nemo. Voluptatem nihil eum est voluptatem voluptatem. Quis et fuga soluta fugit et velit minima facilis voluptatem. Doloremque totam amet veritatis tenetur aut velit. Itaque voluptas impedit id vitae qui aspernatur eos. Voluptatem voluptas id in sint. Enim nisi est. Magnam quibusdam debitis laborum ea dolore. Cum excepturi aut ea aliquid quas voluptatem voluptatem temporibus. Assumenda odit aliquid. Voluptas occaecati consectetur reiciendis officiis rerum provident autem ut sunt. Inventore facere illum unde doloremque quas dignissimos unde. Aut impedit sunt accusantium ipsam nisi et ab ex vitae. Voluptatem eum id. Sed architecto excepturi illum atque magni eum quo qui. Est aspernatur doloribus assumenda eos in ab quasi aut aliquam. Molestiae molestiae dolor voluptatibus. Eveniet fugiat quia nulla quod ducimus qui asperiores ea. Quia officia et voluptas fuga et omnis. Temporibus ut vel officiis veritatis quae qui molestiae. Ratione quo velit quo aut deserunt excepturi minima. Rerum blanditiis iusto impedit consequatur praesentium quas dolorem. In laborum corrupti sint animi. Autem ut perferendis enim molestiae voluptates dolores minima. Maiores nostrum inventore consectetur accusamus voluptatem sit officia tenetur repellendus. Omnis et cum consequatur corporis. Quam corporis officiis quos ea quia veritatis corrupti ad ab. Odio ipsa nemo qui perferendis natus voluptatem consequatur. Nemo vel libero. Asperiores sed labore eligendi animi maiores sit accusantium nemo. Repellat velit quia provident aut accusamus quos. Rerum voluptas non est. Perferendis tenetur vero. Illum cum et perspiciatis impedit inventore ipsum nostrum voluptatem sed. Hic et ducimus. Et qui nihil totam cum debitis ratione ipsam perspiciatis. Ea sit veniam. Aperiam esse libero quod qui consectetur. Recusandae dicta recusandae voluptates non. Sint facilis eum. Aut aliquid voluptatem ut quidem quod ullam quisquam voluptates tenetur. Qui eius non et autem. Omnis doloremque mollitia aut reiciendis eius sit. Consequuntur totam porro enim dignissimos debitis occaecati velit sapiente et. Sed debitis deleniti. Non voluptas molestiae. Illo quia velit id pariatur nostrum. Officia soluta sit perferendis ut rerum facilis ullam ducimus voluptatem. Corrupti quis eaque in. Ipsam at consequatur in minus dolorem. Perspiciatis sunt delectus consequuntur quasi quis nobis quo. Fugiat voluptatem dolor tempora possimus omnis repudiandae corrupti. Quos blanditiis totam ut ratione velit quod quia. Itaque dolorum voluptatem et ad pariatur adipisci. Illo commodi delectus quo et. Esse molestiae neque molestias dolorem quia in possimus. Accusamus voluptate veniam molestias expedita error velit. Enim quaerat qui quae et molestiae excepturi. Eaque molestias sit. Quaerat enim placeat alias. Voluptas impedit omnis placeat voluptatum suscipit et architecto reiciendis. Architecto eum qui occaecati reprehenderit natus excepturi cum soluta quaerat. Eveniet sunt ea libero rerum fuga maiores. Ut atque rerum. Nemo eum architecto omnis. Maiores quod sit est dolore harum dignissimos quaerat provident earum. Molestiae id sed quibusdam est perferendis quaerat odio. Voluptatem quis natus quia nesciunt. Odit occaecati sint sit explicabo corporis quibusdam aut atque. Voluptatum dicta architecto voluptas molestias. Dolore excepturi totam ducimus dolor. Maxime consectetur expedita est distinctio ipsum praesentium. Quos ab aliquid doloribus ut porro voluptatem aut. Voluptas magnam quos sapiente quasi error nostrum possimus vel. Repudiandae debitis quasi. Explicabo recusandae autem. Architecto accusantium aut sapiente deserunt dolorum at quibusdam ducimus. Sit odit molestiae recusandae voluptates consequatur reprehenderit iste quo dolorum. Dolores unde culpa cumque laudantium iste omnis qui consequatur qui. Dolorem vel quos soluta ullam corporis et aut officia ut. Omnis omnis totam commodi veniam sit architecto facere perspiciatis tempora. Perspiciatis in suscipit debitis et autem est. Architecto qui tempore nulla exercitationem totam est. Nisi magnam fugit dolor tenetur vel rerum consequatur sapiente eos. Dicta quia itaque ratione sed. Quia facilis aut. Excepturi nihil quia deserunt quia. Ut aut minima rem velit atque ea sit. Quaerat expedita corrupti distinctio nisi nam autem ut. Cumque dolorum repellat tempora consequatur voluptatem. Enim ut aut et tempora ut quia voluptas esse rerum. Vitae eaque aspernatur voluptatem nihil accusantium velit. Et animi architecto fugiat. Magnam vel fugiat distinctio iste. Similique voluptatem ullam debitis sit iste excepturi. Natus veritatis quam mollitia. Possimus occaecati sunt repudiandae ut a debitis. Placeat libero officia et ea veniam architecto voluptatem excepturi. Sed ut sequi optio dolorem. Debitis et eos et quidem libero corporis non fugiat repellendus. Aliquid aperiam labore rerum reprehenderit consequatur incidunt voluptas. Sapiente enim quam vitae optio sint minus alias labore sapiente. Cupiditate quidem ut facilis. Alias quia ut aut dolor ipsum sed nulla. Soluta et qui omnis recusandae sapiente nemo non est eum. Officiis aliquid voluptatem. Rerum voluptatem hic. Qui voluptatem eveniet blanditiis laborum optio et itaque itaque aut. Provident non est minima voluptates eum harum quibusdam. Omnis voluptatibus quod officiis. Soluta nihil quo. Iusto minus recusandae rerum. Vel itaque non omnis iusto. Quia voluptatem temporibus. Ipsum enim aut. Quibusdam aliquam adipisci qui esse sint neque ea. Et labore maxime fuga qui error. Sit cum culpa aut ut libero quod. Quis alias inventore. Commodi voluptas et velit provident. Laboriosam commodi cupiditate accusantium vero consequatur dolor ullam odio. Non suscipit rem est neque laboriosam porro sit excepturi. Suscipit eius necessitatibus. Magni architecto ipsa eius. Ut ut quisquam. Eaque deleniti tempore. Perspiciatis aperiam omnis commodi molestiae dolore. Accusamus eum placeat sint molestiae officia accusamus architecto commodi. Tempore est hic ad a similique incidunt perferendis. Quasi aspernatur sed qui. Assumenda fuga qui in vero iste praesentium ut. Illum nihil quia doloremque commodi ut. Repellat dolor ratione quae reprehenderit sunt. Sint consectetur nulla facilis eius id. Enim voluptatum molestiae ut fugiat quos omnis nisi. Expedita atque possimus non ex. Minus cupiditate illum commodi optio id et dolor fuga et. Vel consequatur iusto hic eos et. Dicta delectus voluptas minima. Porro ut quod quae vitae voluptatem. Repellendus omnis officia ad maiores nulla molestiae. Tempora quas perspiciatis velit tenetur et est. Hic qui consectetur in. Non occaecati voluptas. Eum suscipit quia aut illum expedita quo. Et et dolor. Et voluptates culpa placeat neque. Quae dolor et dicta id rem quia ut eligendi et. Vero voluptas velit inventore nisi incidunt officia. Quos vitae autem hic deleniti voluptatibus sed. Cum consectetur necessitatibus nostrum velit accusamus repellendus repellat. Quidem ut dolorem possimus. Minus nesciunt id soluta maxime quia nesciunt est. Corrupti enim et reiciendis voluptatum. A velit aliquam enim inventore rerum temporibus. In iusto commodi hic libero enim et corporis et dolores. Id reprehenderit ut mollitia nemo minus aut magni ut. Placeat perferendis a nesciunt aut consequatur et quo autem omnis. Rerum eum accusantium perspiciatis. Est adipisci cumque ratione quidem sit aut ut ex labore. Velit atque non. Ea voluptatem laborum. Similique et quas. Eligendi consequatur libero dicta autem quia magnam aperiam voluptas. Labore doloribus ab rerum dolores iste est. Sit excepturi quam ea assumenda. Provident reprehenderit ad soluta minus assumenda velit. Dicta velit voluptas nihil dolorum. Voluptates ipsa necessitatibus at occaecati porro. Doloribus praesentium similique neque. Tenetur temporibus corrupti perferendis sit ab tempora. Velit voluptatem veritatis. Nisi recusandae voluptas nostrum non suscipit dolor ea delectus. Explicabo quisquam aut eum qui dolore cupiditate suscipit eaque laborum. Delectus iste ipsa pariatur amet. Placeat aliquid aspernatur deserunt amet odio debitis minus nobis adipisci. Eos sapiente corrupti eum doloremque tempora quasi incidunt repellat commodi. Laborum qui omnis beatae et. Et aut perspiciatis impedit molestiae et explicabo. Modi temporibus ab nihil. Consequuntur quasi ut illo aut. Dolor sunt culpa officia. Expedita architecto tenetur dicta incidunt facere doloribus omnis qui at. Quos id distinctio officiis ad. Repellat labore dolore excepturi officia. Odit doloribus corporis et hic sunt quaerat eius. Eaque modi modi qui ut vitae ab. Modi nihil maxime nostrum. Consectetur commodi aut similique consectetur. Id qui provident assumenda qui nesciunt ipsa numquam. Autem quod quo incidunt iusto sit sapiente autem delectus. Ad inventore provident qui consequatur rem quis velit necessitatibus saepe. Et veniam fuga quos assumenda unde. At minima autem. Inventore sit eum nesciunt numquam qui quod sunt. Itaque culpa sunt ut explicabo quos provident. Et consectetur sunt. Nesciunt dicta adipisci iusto aliquid ut. Harum pariatur qui. Eaque dolorem possimus ex unde commodi consequatur non et. Explicabo similique natus eligendi asperiores odit fugit. Sed architecto dolores est ducimus repellendus hic iure. Autem esse nisi voluptas eaque veniam saepe neque qui cumque. Beatae est illum sint impedit et. Odit iusto ratione est distinctio officiis sed eligendi. Voluptatum nostrum minima voluptatem omnis qui. Qui libero consectetur consequatur quia. Quae fugiat blanditiis earum maxime quae. Voluptas magnam recusandae sed eos inventore est voluptatem. Numquam libero quia quia odio quam commodi est et dolorem. Vel nemo consequatur maiores quod fuga illum sed. Blanditiis qui sunt. Inventore excepturi aspernatur eos nulla iure voluptatum nulla. Vel praesentium omnis sit. Magni totam aut sunt in labore aut.' +
  'Aliquid magnam sit nesciunt harum aperiam. Quo quis labore aliquam molestiae consequatur aut inventore nemo iure. Quas sed ut odio in non. Omnis nam aperiam ratione sunt. Nostrum amet aut cupiditate quis similique a iste. Soluta accusamus modi totam aliquam inventore eum quisquam et. Enim repudiandae est quidem commodi magnam sint sapiente id. Molestias aut iusto aspernatur dicta expedita eos voluptas nam. Optio voluptatem fugiat omnis. Enim excepturi facere dignissimos enim molestiae. Nostrum mollitia reiciendis saepe earum fuga. Laborum inventore nam incidunt. Explicabo repudiandae accusantium natus necessitatibus repudiandae consequatur sint nulla. Autem consectetur libero eligendi fugit sunt tempora et repudiandae. Asperiores et qui eligendi aperiam qui sunt atque magnam. Magni exercitationem quam at. Et incidunt aperiam tempore vel ea consequuntur laborum adipisci consequatur. Sunt quas excepturi ea aut tenetur sunt dolorem qui. Consequatur rerum omnis odio ea tempore occaecati. Enim eius sit repellendus fuga repellendus consequatur tenetur consequuntur. Officia minus culpa et alias. Dolor minima tempore. Omnis quis et et aut eos praesentium. Molestias officiis laudantium eos. Et incidunt praesentium et explicabo earum enim minus consequatur. Laboriosam magnam ut sed culpa. Et officia repellendus et. Ab molestiae eos accusantium dolorum. Et porro ipsum doloribus. Aspernatur aut sequi deserunt labore aperiam corporis molestias. Distinctio amet vero accusamus nobis earum reprehenderit. Sint nihil harum facilis perspiciatis in assumenda alias neque neque. Aperiam animi est voluptates deleniti ut voluptatum. Consequatur qui eius quam et tenetur fugiat. In aut praesentium sit tenetur. Perspiciatis cupiditate et libero expedita commodi autem laboriosam ratione. Voluptatem sed nam dolorum debitis et ducimus. Ut odio cupiditate dolorem quam ut et provident non. Quis placeat voluptas ut commodi illum. Sint repellat maxime velit molestiae nemo doloremque et. Incidunt repellendus inventore at atque sed. Nam neque voluptas consequuntur asperiores aut voluptas. Porro labore in voluptatem iste sint dolorem. Dolorem vel voluptas explicabo vel ducimus et dignissimos. Placeat quo voluptatem aut. Est earum harum atque. Itaque alias occaecati neque quidem et atque pariatur cupiditate. Quia necessitatibus cumque consectetur sint sed tempore. Quidem illum voluptas voluptate eum voluptatem. Molestiae sint illum quidem qui doloremque molestiae libero occaecati et. Accusamus qui atque eligendi quia voluptatibus dolore. Minus ducimus unde qui quisquam consequuntur dolores perferendis in fuga. Facilis animi est autem in. Ducimus perferendis sit ut ipsum enim reiciendis. Consequatur sint ut libero sed illum. Eaque ut qui exercitationem. Autem eveniet sint et quam rerum. Veritatis et iusto vel voluptatem corporis dolorem odit. Harum non enim deserunt quia repellat et. Dolor aliquam nisi pariatur sequi. Expedita unde sapiente reiciendis et expedita modi tempora debitis voluptas. Quas explicabo illum atque saepe. Fuga culpa ipsa. Fugit iste voluptatum sint aliquam mollitia quia eveniet adipisci. Hic eos et architecto facilis nihil aut. Est quidem illo quam adipisci et omnis sunt. Velit pariatur excepturi facilis similique. Consequatur repellendus voluptatem consectetur dolores soluta porro aut. Accusamus incidunt velit eum saepe. Omnis atque similique non autem nam. Esse harum est. Aliquid soluta accusantium et. Velit delectus beatae nihil blanditiis est occaecati. Provident sequi sint. Maxime ut dignissimos. Perferendis animi in. Aut aut veritatis animi dolorem quae. Vitae nihil nisi ullam accusamus temporibus deleniti dolorem. Sed amet sed. Fuga aut eum ut adipisci dolor autem. Ab sed veritatis et voluptatem earum ut sit. Nobis rem voluptas. Ab repellendus sit. Corporis soluta officiis consequatur ut quidem sint. Voluptatum repellendus explicabo. Voluptatem omnis veniam numquam illum enim. Eius fuga eveniet suscipit consequuntur non ipsa. Architecto voluptatem quibusdam. Id veniam dolores minima aut. Repellat ab sint. Dolorem fuga fugit quis officiis vel fuga sequi nihil. Nisi ad necessitatibus est quos natus quia quia. Molestiae earum corporis tenetur temporibus rerum. Esse sapiente facere exercitationem qui. Incidunt nesciunt molestiae atque soluta. Fugiat eos et harum id. Iure sapiente placeat. Ad unde nihil natus eligendi nobis ipsum. Laborum quo aut perspiciatis doloribus numquam. Et modi esse. Quia et provident eos eaque accusamus quibusdam nemo. Illo dolor animi dolores qui assumenda tempora expedita. Beatae voluptate qui ullam dolor modi magnam quia blanditiis eos. Quaerat minima iure non. Accusamus enim est ea voluptatum deserunt architecto et earum odit. Debitis dolor magni quas odio. Cupiditate quo asperiores. Ut placeat praesentium. Dolorem saepe incidunt sed ducimus laboriosam eos. Eos id minus quia ullam provident porro. Molestiae laboriosam illo qui quam placeat optio hic labore corrupti. Qui sunt est voluptas nesciunt sapiente dolorum distinctio qui id. Et iure excepturi. Suscipit quis veritatis quaerat. Et quia sit voluptatem consequatur cum. Tempora autem cumque et tempore molestiae sunt qui. Ipsam consequuntur minus. Nulla nisi consequatur recusandae non. Nisi sint voluptates. Commodi est cupiditate quasi non soluta delectus velit facilis. Consequuntur animi iusto. Facere neque inventore corporis temporibus laboriosam sunt. Veniam est et minima repellendus hic eos porro quos. Ut laboriosam minus et ea ut aut. Ad pariatur ullam ullam dolorem placeat sed suscipit. Rerum dolores est at corrupti sunt ipsam. Impedit minus perspiciatis dolorem. Sunt tenetur consectetur voluptatem quidem. Suscipit magnam sunt dignissimos. Voluptatem est qui illo aut similique aut. Ut sint in occaecati. Qui tenetur voluptates sit blanditiis repellendus odio cupiditate ea reprehenderit. Accusantium aut dolorem doloremque consectetur dolor et sed sunt. Commodi architecto architecto dolor. Eligendi eos qui nam vitae. Quaerat provident unde. Ut id alias maxime rerum et et. Sed adipisci qui adipisci. Quia tempora aliquid nulla sapiente molestiae ipsam tempora. Qui quia accusamus est velit error. Modi qui illum quos voluptas cum. Dolorem commodi non magni illo est repellat. Explicabo quia in laboriosam voluptatibus. Quo ex maxime blanditiis voluptates commodi. Laborum quos amet hic optio ab. Temporibus qui fugiat magnam facere temporibus commodi libero magni. Et tempore veritatis velit vel rerum. Quia eum qui numquam a alias voluptatum aperiam. Quod facere sed. Laborum velit sit est aperiam. Facilis atque et hic vel autem voluptas. Et mollitia ut. Cum molestiae vel harum architecto. Accusamus at atque iste excepturi. Est aut est rem nihil aut necessitatibus voluptas ea. Libero consequatur molestiae sint. Aspernatur repellendus quas commodi animi ratione maxime et. Soluta et debitis magni enim architecto necessitatibus. Suscipit aut repudiandae architecto porro. Ipsa dolorem et omnis adipisci dignissimos. Deleniti omnis eos expedita veritatis non sapiente omnis voluptatum rerum. Quo ut veritatis eos esse amet consectetur consequatur. Enim est voluptatem aut et recusandae dicta consequatur. Tempora reprehenderit nulla aut dolores in. Perspiciatis exercitationem saepe unde illo dolorum. Corrupti magni tempore ab facere voluptatem sequi. Nisi voluptates architecto occaecati cupiditate possimus. Magnam eveniet qui quaerat ea cupiditate magni sapiente doloremque harum. Rerum animi cum sit officia eius enim. Dolorum quibusdam aut. Explicabo dolorem ut illo. Accusamus laudantium enim. Reprehenderit veniam molestiae voluptate aliquam. Molestiae exercitationem enim consequuntur expedita. Vero praesentium iste sunt magni facilis distinctio molestias perferendis. Esse hic eaque amet. Consequuntur omnis qui. Dolor deserunt explicabo et soluta. Harum et vitae molestiae accusamus similique. Recusandae voluptatem quasi voluptatem occaecati repellendus. At accusantium corporis. Soluta quasi quasi eum. Earum deserunt quia eos. Est doloribus omnis tempore nisi. Ea soluta quibusdam impedit. Voluptatem omnis voluptatem reiciendis. Eos dicta quo natus qui minima natus velit. Sunt quae voluptatem sapiente et error adipisci modi eveniet. Omnis ad dolores occaecati et. Aperiam animi unde debitis perspiciatis facere. Ex aut quidem harum non. Laborum assumenda suscipit. Id sed voluptas sit expedita minima et quia. Beatae inventore itaque dicta consequatur quia a odit. Aut rem explicabo iste magnam aut. Culpa numquam natus laborum. Et vel fuga dolor voluptates non delectus sit et quia. Animi iure nihil maxime eligendi itaque expedita quia aut nobis. Porro praesentium molestias ut et et. Id ut ut dignissimos. Adipisci sed dolorem et numquam dolorem voluptatem explicabo vel. Sed consequatur autem. Aut quisquam accusamus voluptatem consequatur non tenetur nemo consectetur. Mollitia consequatur quidem fugit modi aperiam quia eum. Qui optio tempora et voluptatem placeat accusantium et. Itaque non dignissimos beatae natus quae. Mollitia ut laborum ipsam. Itaque autem asperiores expedita ipsam rerum est doloremque aut accusamus. Qui quis aspernatur. Sint voluptatem alias repudiandae commodi ipsa in laudantium. Iusto atque voluptatem voluptas veniam voluptas omnis. Minus suscipit repellat voluptatem modi sapiente. Accusantium ut distinctio reiciendis officiis et et. Cupiditate voluptatem non dolore dicta aperiam aut numquam ipsum. Expedita dolores hic voluptas ut numquam reiciendis. Facilis nobis molestiae dignissimos nihil ad natus non est dolor. Quaerat molestiae nihil et inventore consequatur aliquam. Beatae culpa et nihil adipisci. Est aliquid molestiae molestias neque natus. Voluptatem dolores sapiente impedit est nostrum odio quidem necessitatibus. Quia sit repellat et odio. Et in cupiditate autem sit voluptatum aut facere. Sunt voluptatum doloribus eos blanditiis soluta voluptatem ex facilis. Illo ratione rem nihil nesciunt quod maiores. ' +
  'Velit provident iste aut laborum itaque. Qui in eius omnis voluptatem. Earum asperiores exercitationem. Adipisci cumque quibusdam. Non consequatur suscipit quibusdam eum est aspernatur sit. Magni molestias pariatur quod asperiores nesciunt. Aut sunt laboriosam ad architecto facilis dolore. Aut et qui sunt distinctio ut itaque similique. Minus eius tempora nobis aut aut et. Blanditiis nulla illo. Pariatur qui distinctio quo dolorem enim repudiandae aut perspiciatis. Eveniet est quidem vero iusto. Beatae qui hic autem et. Aspernatur necessitatibus similique et est ut suscipit. Consequatur eius atque consequuntur et dolores. Sit nihil quo. Non accusantium quia consectetur quos nostrum. Quos exercitationem et. Suscipit illo beatae magnam eius aut. Quidem qui recusandae et quae velit aspernatur voluptates. Possimus et totam et quae temporibus quidem consequatur quis quia. Qui rerum libero consequatur velit et totam. Eius odio vero quaerat dignissimos sed. Quo rerum quis nisi dolorum aut voluptas. Nesciunt rerum amet corrupti aut earum est ex eius. Ipsam voluptas quasi quisquam ipsum temporibus. Sit consectetur qui tenetur ut vel rerum laborum. Impedit et placeat voluptate magni. Natus eos quod alias in nihil nam. Doloremque et velit beatae quam aut accusamus ullam. Quas veritatis doloremque. Neque quaerat qui hic harum reprehenderit libero iure. Maxime reiciendis dolor. Nisi perspiciatis porro optio hic fugit molestiae quis aut reprehenderit. Quia deserunt culpa accusantium perspiciatis alias ut beatae. Aliquam id aliquam facilis est earum aut. Cumque iure quia minus dolorum nulla ut ullam. Eum molestiae iusto voluptatem qui. Ut id inventore alias ducimus et quam ut. Sint dolorum animi. Minima nam iusto voluptatibus. Et eos tenetur occaecati voluptatem est itaque. Quis mollitia et optio expedita explicabo quia accusamus iste. Quia dolorem exercitationem. Sapiente beatae ipsum ipsum aliquam incidunt sapiente ut. Culpa consequatur consequatur exercitationem. Alias molestiae numquam delectus a. Nesciunt culpa et. Quia sunt molestiae et omnis sunt eius et quibusdam repellat. Quo vitae qui voluptatem pariatur nostrum iusto fugit. Magni reprehenderit distinctio inventore enim. Eligendi omnis qui pariatur et adipisci. Fugit sint dignissimos est iste ut accusantium. Iusto vel magnam minima sunt molestiae. Consectetur autem delectus sint qui sed corporis numquam. Molestiae aut voluptatem. Doloribus sit accusantium beatae et error facere quaerat maxime voluptate. Fuga non eos voluptas rerum voluptatum odit voluptatem eligendi. Aspernatur iure non eveniet voluptas qui eligendi. Ut autem omnis. Sit ut repudiandae nihil officiis voluptatum. Repellendus facere provident incidunt similique. Aliquid vitae tenetur saepe ipsum et inventore officiis ea. Adipisci rerum dolorem. Delectus velit est cupiditate. Ab sed tempore consequatur soluta ipsa non. Totam harum atque. Nam exercitationem molestiae ut mollitia et. Sed veritatis vel. Ea aliquam dolores et magnam voluptatem ut. Consectetur debitis consequatur. Sequi quisquam repellendus dolor in dignissimos eaque beatae nobis. Ab non repellat neque ut. Magnam et odio et suscipit voluptates ipsam. Vero ipsum perferendis voluptas dolorem eum sapiente ea et. Qui repellendus iusto magnam ex unde et occaecati asperiores. Totam repellat ut hic illum ratione. Eos ut earum quo officia distinctio aut sapiente. Omnis ducimus ea aut dicta quo cupiditate veritatis natus. A dolor pariatur sunt voluptatum fugit. Et sit commodi repellendus. Non commodi vel dolor deleniti ipsam quas culpa possimus. Sunt laudantium ratione perspiciatis laboriosam non accusamus earum et numquam. Quasi fuga veritatis qui nihil ea. Commodi est repellat amet non possimus nam accusamus. Pariatur deserunt voluptatum ea aliquid est enim asperiores dolor. Hic non id. Necessitatibus officia facilis aut ut labore voluptas. Iure suscipit doloremque est ut et. Enim excepturi ut repudiandae quos expedita. Asperiores quod maiores. Minus rerum non et adipisci velit totam qui. Quia aut rerum beatae quibusdam voluptatem nam aut amet sunt. Architecto praesentium cum quidem distinctio ipsum. Sed iusto molestias consequatur quidem. Consequatur vitae doloremque. Sed dignissimos cum aut. Voluptatem recusandae tempore quae corporis sit autem. Incidunt autem non non dolorem eius est non hic doloremque. Quia unde consequatur enim sed. Sint voluptatem unde velit sit. Consequatur dolorem nihil necessitatibus explicabo. Nobis fuga tempora et velit rerum at aut. Aperiam adipisci nam distinctio. Est temporibus magnam sunt sed et enim voluptatem vitae. Non velit suscipit. Aliquam ad qui. Ipsam velit aperiam quia vitae voluptas temporibus. Est omnis perspiciatis. Sint quis aliquid placeat fugiat. Enim voluptatum quo est aut qui deserunt. Esse eveniet repellat repudiandae eius laudantium ducimus magnam et et. Est rerum quo magni eos laboriosam. Architecto et provident rerum inventore sunt sed. Animi nemo molestias est et quod culpa atque ipsam. Est inventore suscipit iure. Culpa impedit deserunt ullam vitae iste quidem illo minus ea. Necessitatibus minus totam dolorem eaque corrupti eos laudantium. Similique delectus dolor qui. Esse ratione nihil dolor et repellendus quis ut. Animi quia recusandae quia earum perferendis atque amet doloribus. Quia consequatur dignissimos eos et nemo. Quam voluptatem nemo pariatur et maxime temporibus sed saepe enim. Qui sed laborum qui quibusdam voluptas a eum. Est aliquid aperiam ut. Doloribus voluptatum ea sint. Laborum ex ab omnis blanditiis ea. Qui minus autem neque adipisci quis omnis aspernatur accusamus eius. Incidunt itaque eveniet dolor. Sunt excepturi possimus iste quidem autem voluptatibus error. Et ab sint enim est corrupti repudiandae voluptas. Aut sunt omnis repudiandae qui nihil. Quaerat expedita aut fugit adipisci temporibus accusantium veniam dolore. Eius magnam magni. Quia ab maxime eum et perferendis animi quidem et ipsa. Qui consequatur et minus sed maxime et. Eaque excepturi nam et quaerat qui et eos dolore voluptatum. Amet labore expedita possimus. Officiis id itaque occaecati. Temporibus consequatur dicta quasi illo dolores dolore dolor qui iure. Quos a dolores cum. Qui nulla sequi fugiat cumque aliquid consequuntur dolorem repellendus. Quaerat quas omnis aut omnis non debitis eligendi. Ipsum et nulla aut ut autem sunt eos. Aliquam accusantium omnis tempora id iste quos omnis magnam. Ex temporibus eos facere voluptatibus aspernatur ducimus voluptate hic aut. Nihil blanditiis neque dolorum tempore a amet enim repudiandae. Et eos aut et aliquam voluptas. Nihil natus accusamus. Totam qui autem nulla beatae facere. Eum distinctio quos voluptatem harum hic rerum. Earum est voluptatem inventore vero. Quia non alias possimus eaque ad. Officia blanditiis qui cupiditate deserunt consequatur sed. Eligendi est numquam maiores sunt. Totam neque reiciendis quod est enim. Impedit velit deserunt necessitatibus reprehenderit quas. Ea ea aliquid aut animi occaecati quia aut sit nihil. Ipsa vel distinctio dignissimos sed eligendi. Aut quod dolorum temporibus eligendi voluptas dolores aut ratione. Soluta eum maiores dolorem numquam molestiae ut molestiae tempora sequi. Et voluptas impedit sint qui nihil eum eius ea praesentium. Odio sunt dicta. Cum sed exercitationem. Earum eos quae. Quo eius iure. Quaerat natus voluptas quam. Quis ut officiis assumenda rerum quisquam et ducimus. Corrupti delectus veniam quaerat rem. Error aut qui quo sapiente. Aut aut ratione natus. Maiores voluptas incidunt accusamus ipsam ad voluptatem fuga. Voluptatem sint sunt magni et blanditiis minus exercitationem id cupiditate. Exercitationem doloribus quae sapiente nihil et temporibus quos at nesciunt. Ipsam ratione error corporis atque blanditiis corrupti. Consequatur dignissimos error. Ea et reprehenderit nostrum sunt officia veritatis. Eos incidunt ipsam. Sint enim omnis dolores in porro. Voluptas sit quis dolorem esse ullam. Commodi dicta minus quidem ut odio. Error et totam dolore et unde aut quia modi. Dolores vel aliquam ut eligendi eligendi nihil. Veritatis ratione nihil nobis debitis. Quia libero quia eligendi. Nesciunt voluptatibus dicta ex. Nam enim enim esse asperiores impedit consequatur non. Sint aperiam quis quasi autem est sed at. Sed voluptates consequatur eius modi qui consequuntur cum voluptas. Dignissimos accusamus minima sunt dolorem sed. Nihil at quasi quam dolorem odit. Commodi odio nam voluptatem excepturi. Debitis ut aut tenetur quos. Repudiandae reiciendis quisquam totam sit consequuntur. Adipisci occaecati in inventore distinctio. Reiciendis id iusto. Sunt vero ut enim sunt et tenetur debitis deserunt est. Labore ea quaerat. Ea vero assumenda qui ut expedita ullam aut nostrum. Velit soluta et voluptas praesentium. Non maiores cumque perspiciatis quo in sunt non aut culpa. Ratione magnam quia. Quaerat et molestias quisquam sit. Adipisci nostrum voluptatem perferendis. Ipsa quasi enim autem distinctio sint minima inventore laboriosam. Sed odit quibusdam exercitationem sed eligendi rerum recusandae. Eos dicta fugiat mollitia sit natus doloremque sit voluptate sed. In occaecati voluptatem minus. Facere possimus aut. Eos magni voluptatem incidunt aliquid. Ad est quia quidem laudantium. Eum numquam consequatur nihil nihil iusto rerum nihil expedita. Ut dignissimos ea. Qui illum dolorem rerum voluptates voluptate ab veritatis nihil unde. Illo aut corrupti aut. Ex vel laboriosam. Laboriosam reiciendis dolorem non iure explicabo repellat. Et quo minima ratione. Et tempora velit beatae dignissimos voluptatem eius unde illo. Eos id eius. Officia rerum aliquid excepturi et sapiente. Nulla illo quasi eos adipisci qui similique. Molestias excepturi ut odit porro quisquam doloribus culpa. Voluptatem consectetur sunt nesciunt aut quis. Facilis atque iusto. Rerum provident quis accusamus voluptas eaque quae. Quaerat consectetur quis quae distinctio numquam recusandae amet et. Mollitia amet ad magnam sint. ' +
  'Et quas doloremque in cum doloribus repudiandae. Laboriosam sit enim corporis eligendi beatae praesentium. Tenetur quae aut et qui quia. Velit qui sequi maiores maiores necessitatibus at vel et voluptatem. Sit occaecati accusantium repellat expedita nesciunt consectetur doloribus. Quibusdam optio non totam. Consectetur reiciendis quas accusantium ipsa voluptatem reprehenderit dolor saepe eum. Dolores sit enim dolorum commodi corporis qui reprehenderit in. Accusamus expedita excepturi quaerat odit. Eligendi eum ut enim ut recusandae vel. Debitis non numquam ducimus consectetur hic est nulla. Necessitatibus recusandae eos id. Quia sapiente debitis sed eos aperiam. Asperiores sunt debitis. Cum veniam eaque explicabo est aspernatur ullam qui. Similique voluptas iusto magnam sit omnis est mollitia facilis. Et voluptatem quia sint. Earum tempore ad nulla quia. Est autem animi. Voluptas blanditiis officiis eum atque porro veniam vel atque fugiat. Unde consequuntur autem aut dolore suscipit cumque. Accusamus soluta sit. Sunt maxime tenetur magnam sit. Sed voluptas ex ea iure et voluptatem. Ut assumenda molestias qui. Amet consequatur ipsum voluptatibus rerum. Excepturi sequi provident enim ut commodi deleniti. Commodi dolorum quia expedita doloribus. Deserunt modi non et aut maxime. Maiores est similique sed aut quia sit libero ut dolorem. Autem eius voluptas libero doloribus non libero adipisci. Asperiores temporibus provident quia dignissimos voluptate dolorem quia. Architecto omnis pariatur omnis optio quos eligendi. Praesentium est officia recusandae earum quae quo. Nisi qui veritatis nulla voluptates qui unde. Id qui voluptatibus voluptatem aut praesentium iste ut non. Doloribus maxime ut commodi aut id sunt corrupti. Corrupti rerum consequatur numquam at. Et autem quod quo repellat eligendi in rerum a. Illum sint nihil sed et sint. Iure impedit officia quia enim. Et ad id maxime. Qui ipsam perspiciatis. Excepturi minus amet inventore sit magnam enim sint est placeat. Qui eveniet officiis officia tempore aut odio hic qui. Animi eaque quasi. Adipisci veritatis sequi voluptas debitis voluptate. Possimus numquam et nesciunt. Soluta et eos nulla dicta voluptatem dignissimos est. Occaecati ducimus molestias adipisci ducimus soluta voluptatem molestiae. Tempore deserunt dolorum voluptatem dolor doloribus. Dolore quia maxime non esse recusandae. Illo rerum asperiores totam sapiente ad. Officia repellat inventore cum rerum eum. Aut unde et quod. Quia est ad aperiam. Qui adipisci commodi aut dolores perspiciatis. Cumque veniam dolore et iste officia sed. Ea magnam molestiae sunt amet ut. Maxime quae natus placeat hic illum vel rerum rerum in. Cupiditate cupiditate deserunt consequatur eos ad eum dolorum fuga repellat. Explicabo repellat non praesentium tenetur expedita eius. Ea numquam veniam laborum deleniti. Harum consequatur eveniet autem assumenda ut ut recus';

const createClient = (options) => {
  options = { ...options };

  const client = new Analytics('key', `${host}:${port}`, options);
  client.flushed = true;

  return client;
};

test.before.cb((t) => {
  express()
    .use(bodyParser.json({ limit: '4mb' }))
    .post('/', (req, res) => {
      const batch = req.body.batch;

      const { name: writeKey } = auth(req);
      if (!writeKey) {
        return res.status(400).json({
          error: { message: 'missing write key' },
        });
      }

      const ua = req.get('user-agent');
      if (ua !== `expo-rudder-sdk-node/${version}`) {
        return res.status(400).json({
          error: { message: 'invalid user-agent' },
        });
      }

      if (batch[0].command === 'error') {
        return res.status(400).json({
          error: { message: 'error' },
        });
      }

      if (batch[0].command === 'timeout') {
        return setTimeout(() => res.end(), 5000);
      }

      if (batch[0] && batch[0].properties && batch[0].properties.delay) {
        return setTimeout(() => res.json(req.body), batch[0].properties.delay);
      }

      res.json(req.body);
    })
    .listen(port, t.end);
});

test('expose a constructor', (t) => {
  t.is(typeof Analytics, 'function');
});

test('require a write key', (t) => {
  t.throws(() => new Analytics(), "The project's write key must be specified");
});

test('create a queue', (t) => {
  const client = createClient();

  t.deepEqual(client.queue, []);
});

test('default options', (t) => {
  t.throws(() => new Analytics('key'), 'The data plane URL must be specified');
});

test('remove trailing slashes from `host`', (t) => {
  const client = new Analytics('key', 'http://google.com///');

  t.is(client.host, 'http://google.com');
  t.is(client.writeKey, 'key');
  t.is(client.flushAt, 20);
  t.is(client.flushInterval, 20000);
});

test('overwrite defaults with options', (t) => {
  const client = new Analytics('key', 'a', {
    flushAt: 1,
    flushInterval: 2,
  });

  t.is(client.host, 'a');
  t.is(client.flushAt, 1);
  t.is(client.flushInterval, 2);
});

test('keep the flushAt option above zero', (t) => {
  const client = createClient({ flushAt: 0 });

  t.is(client.flushAt, 1);
});

test('enqueue - add a message to the queue', (t) => {
  const client = createClient();

  const originalTimestamp = new Date();
  client.enqueue('type', { originalTimestamp }, noop);

  t.is(client.queue.length, 1);

  const item = client.queue.pop();

  t.is(typeof item.message.messageId, 'string');
  t.regex(item.message.messageId, /node-[a-zA-Z0-9]{32}/);
  t.deepEqual(item, {
    message: {
      originalTimestamp,
      type: 'type',
      context,
      _metadata: metadata,
      messageId: item.message.messageId,
    },
    callback: noop,
  });
});

test("enqueue - don't modify the original message", (t) => {
  const client = createClient();
  const message = { event: 'test' };

  client.enqueue('type', message);

  t.deepEqual(message, { event: 'test' });
});

test('enqueue - flush on first message', (t) => {
  const client = createClient({ flushAt: 2 });
  client.flushed = false;
  spy(client, 'flush');

  client.enqueue('type', {});
  t.true(client.flush.calledOnce);

  client.enqueue('type', {});
  t.true(client.flush.calledOnce);

  client.enqueue('type', {});
  t.true(client.flush.calledTwice);
});

test('enqueue - flush the queue if it hits the max length', (t) => {
  const client = createClient({
    flushAt: 1,
    flushInterval: null,
  });

  stub(client, 'flush');

  client.enqueue('type', {});

  t.true(client.flush.calledOnce);
});

test('enqueue - flush after a period of time', async (t) => {
  const client = createClient({ flushInterval: 10 });
  stub(client, 'flush');

  client.enqueue('type', {});

  t.false(client.flush.called);
  await delay(20);

  t.true(client.flush.calledOnce);
});

test("enqueue - don't reset an existing timer", async (t) => {
  const client = createClient({ flushInterval: 10 });
  stub(client, 'flush');

  client.enqueue('type', {});
  await delay(5);
  client.enqueue('type', {});
  await delay(5);

  t.true(client.flush.calledOnce);
});

test('enqueue - extend context', (t) => {
  const client = createClient();

  client.enqueue(
    'type',
    {
      event: 'test',
      context: { name: 'travis' },
    },
    noop
  );

  const actualContext = client.queue[0].message.context;
  const expectedContext = { ...context, name: 'travis' };

  t.deepEqual(actualContext, expectedContext);
});

test('enqueue - skip when client is disabled', async (t) => {
  const client = createClient({ enable: false });
  stub(client, 'flush');

  const callback = spy();
  client.enqueue('type', {}, callback);
  await delay(5);

  t.true(callback.calledOnce);
  t.false(client.flush.called);
});

test('enqueue - limits the queue size to maxQueueLength', (t) => {
  const maxQueueLength = 3;
  const client = createClient({ maxQueueLength });

  for (let i = 0; i < 6; i++) {
    client.track({ userId: 'userId', event: 'event' });
  }

  t.is(client.queue.length, maxQueueLength);
});

test('enqueue - allows messages > 32kb', (t) => {
  const client = createClient();

  t.notThrows(() => {
    client.track({ userId: '1', event: 'event', properties: { largeText } }, noop);
  });
});

test("flush - don't fail when queue is empty", async (t) => {
  const client = createClient();

  await t.notThrows(client.flush());
});

test('flush - send messages', async (t) => {
  const client = createClient({ flushAt: 2 });

  const callbackA = spy();
  const callbackB = spy();
  const callbackC = spy();

  client.identify({ userId: 'id', traits: { traitOne: 'a1' } }, callbackA);
  client.page({ userId: 'id', category: 'category', name: 'b1' }, callbackB);
  client.track({ userId: 'id', event: 'c1' }, callbackC);

  const [flushResponse] = await client.flush();
  await delay(5); // ensure the test context exists long enough for the second flush to occur
  t.deepEqual(Object.keys(flushResponse), ['error', 'data']);
  t.is(flushResponse.error, undefined);
  const firstMessage = flushResponse.data.batch[0];
  const firstMessageKeys = Object.keys(firstMessage);
  t.true(firstMessageKeys.includes('originalTimestamp'));
  t.true(firstMessageKeys.includes('sentAt'));
  t.true(firstMessage.sentAt instanceof Date);
  t.true(callbackA.calledOnce);
  t.true(callbackB.calledOnce);
  t.true(callbackC.calledOnce);
});

test('flush - respond with an error', async (t) => {
  const client = createClient();
  const callback = spy();

  client.queue = [
    {
      message: { command: 'error', messageId: '123' },
      callback,
    },
  ];

  const [flushResponse] = await client.flush();
  t.true(flushResponse.error instanceof Error);
  t.is(flushResponse.error.message, 'Bad Request');
});

test('flush - time out if configured', async (t) => {
  const client = createClient({ timeout: 500 });
  const callback = spy();

  client.queue = [
    {
      message: { command: 'timeout', messageId: '123' },
      callback,
    },
  ];

  const [flushResponse] = await client.flush();
  t.true(flushResponse.error instanceof Error);
  t.is(flushResponse.error.message, `network timeout at: ${host}:${port}/`);
});

test('flush - skip when client is disabled', async (t) => {
  const client = createClient({ enable: false });
  const callback = spy();

  client.queue = [
    {
      message: 'test',
      callback,
    },
  ];

  await client.flush();

  t.false(callback.called);
});

// expect a max of 9 events per flush because other properties of
// the event -- userId, event, etc... -- push the payload above 10 * largeText.size
for (const [trackCount, executeFlushProcessedMessageLength] of [
  [1, []],
  [5, []],
  [10, [undefined, 9]],
  [20, [undefined, 9, 18]],
]) {
  const maxFlushSizeInBytes = 10 * largeText.length;
  const flushSize = trackCount * largeText.length;

  test(`flush - ensure queue with size of ${flushSize} is split into multiple requests smaller than the maxFlushSizeInBytes of ${maxFlushSizeInBytes}`, async (t) => {
    const client = createClient({ maxFlushSizeInBytes, flushAt: 15 });
    const executeFlushSpy = spy(client, 'executeFlush');

    for (let i = 0; i < trackCount; i++) {
      client.track({
        userId: 'userId',
        event: 'event',
        properties: {
          largeText,
        },
      });
    }
    const flushResponse = await client.flush();
    t.true(flushResponse.every((response) => !response.error));
    t.is(flushResponse.flatMap((response) => response.data.batch).length, trackCount);
    for (let i = 0; i < executeFlushSpy.callCount; i++) {
      const processedMessages = executeFlushSpy.getCall(i).args[0];
      const processedMessageLength = processedMessages ? processedMessages.length : undefined;
      t.is(processedMessageLength, executeFlushProcessedMessageLength[i]);
    }
  });
}

test('flush - enforce one in-flight flush at a time', async (t) => {
  const flushAt = 2;
  const messageCount = 9;
  const client = createClient({ flushAt, flushInterval: 99999 });
  spy(client, 'flush');
  spy(client, 'executeFlush');

  for (let i = 0; i < messageCount; i++) {
    client.track({
      userId: 'userId',
      event: 'event',
      properties: { count: i, delay: '5' },
    });
    t.is(client.flush.callCount, Math.round(i / flushAt));
  }
  t.true(client.executeFlush.calledOnce);

  const flushResponse = await client.flush();
  t.true(client.flushResponses.length === 0);
  t.true(client.executeFlush.calledTwice);
  t.is(client.flush.callCount, Math.round(messageCount / flushAt));
  const batches = flushResponse.flatMap((response) => response.data.batch);
  t.is(batches.length, messageCount);
  batches.map((item, index) => t.is(item.properties.count, index)); // sends events in order
});

test('flush - callbacks are queued, called once, then removed', async (t) => {
  const client = createClient({ flushAt: 4 });

  const callbackA = spy();
  const callbackB = spy();
  const callbackC = spy();
  const callbackD = spy();
  const callbacks = [callbackA, callbackB, callbackC, callbackD];

  client.track({
    userId: 'userId',
    event: 'callback-event',
    properties: { delay: '5' },
  });
  client.flush(callbackA);

  client.track({
    userId: 'userId',
    event: 'callback-event',
    properties: { delay: '5' },
  });
  await client.flush(callbackB);

  client.track({
    userId: 'userId',
    event: 'callback-event-2',
    properties: { delay: '5' },
  });
  await client.flush(callbackC);
  client.flush(callbackD);
  await delay(5); // setImmediate causes the callbacks get executed after a delay

  callbacks.forEach((callback, i) => {
    const args = callback.getCall(0).args[0];
    const errors = args.flatMap((response) => response.error);
    const events = args.flatMap((response) => response.data.batch.map((item) => item.event));

    errors.map((error) => t.true(!error));
    if (i < 2) {
      events.map((event) => t.is(event, 'callback-event'));
    } else {
      events.map((event) => t.is(event, 'callback-event-2'));
    }
    t.true(callback.calledOnce);
  });
  t.is(client.flushCallbacks.length, 0);
});

test('flush - timer does not exist after a flush', async (t) => {
  const client = createClient({
    flushAt: 2,
    flushInterval: 10,
  });
  spy(client, 'flush');

  // flush interval
  client.enqueue('type', {});
  await delay(20);
  t.is(client.timer, null);

  // manual flush
  client.enqueue('type', {});
  await client.flush();
  t.is(client.timer, null);

  // flush at
  client.enqueue('type', {});
  client.enqueue('type', {});
  await delay(5);
  t.is(client.timer, null);
});

test('identify - enqueue a message', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  const message = { userId: 'id' };
  client.identify(message, noop);

  t.true(client.enqueue.calledOnce);
  t.deepEqual(client.enqueue.firstCall.args, ['identify', message, noop]);
});

test('identify - require a userId or anonymousId', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  t.throws(() => client.identify(), 'You must pass a message object.');
  t.throws(() => client.identify({}), 'You must pass either an "anonymousId" or a "userId".');
  t.notThrows(() => client.identify({ userId: 'id' }));
  t.notThrows(() => client.identify({ anonymousId: 'id' }));
});

test('group - enqueue a message', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  const message = {
    groupId: 'id',
    userId: 'id',
  };

  client.group(message, noop);

  t.true(client.enqueue.calledOnce);
  t.deepEqual(client.enqueue.firstCall.args, ['group', message, noop]);
});

test('group - require a groupId and either userId or anonymousId', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  t.throws(() => client.group(), 'You must pass a message object.');
  t.throws(() => client.group({}), 'You must pass either an "anonymousId" or a "userId".');
  t.throws(() => client.group({ userId: 'id' }), 'You must pass a "groupId".');
  t.throws(() => client.group({ anonymousId: 'id' }), 'You must pass a "groupId".');
  t.notThrows(() => {
    client.group({
      groupId: 'id',
      userId: 'id',
    });
  });

  t.notThrows(() => {
    client.group({
      groupId: 'id',
      anonymousId: 'id',
    });
  });
});

test('track - enqueue a message', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  const message = {
    userId: '1',
    event: 'event',
  };

  client.track(message, noop);

  t.true(client.enqueue.calledOnce);
  t.deepEqual(client.enqueue.firstCall.args, ['track', message, noop]);
});

test('track - require event and either userId or anonymousId', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  t.throws(() => client.track(), 'You must pass a message object.');
  t.throws(() => client.track({}), 'You must pass either an "anonymousId" or a "userId".');
  t.throws(() => client.track({ userId: 'id' }), 'You must pass an "event".');
  t.throws(() => client.track({ anonymousId: 'id' }), 'You must pass an "event".');
  t.notThrows(() => {
    client.track({
      userId: 'id',
      event: 'event',
    });
  });

  t.notThrows(() => {
    client.track({
      anonymousId: 'id',
      event: 'event',
    });
  });
});

test('page - enqueue a message', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  const message = { userId: 'id' };
  client.page(message, noop);

  t.true(client.enqueue.calledOnce);
  t.deepEqual(client.enqueue.firstCall.args, ['page', message, noop]);
});

test('page - require either userId or anonymousId', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  t.throws(() => client.page(), 'You must pass a message object.');
  t.throws(() => client.page({}), 'You must pass either an "anonymousId" or a "userId".');
  t.notThrows(() => client.page({ userId: 'id' }));
  t.notThrows(() => client.page({ anonymousId: 'id' }));
});

test('screen - enqueue a message', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  const message = { userId: 'id' };
  client.screen(message, noop);

  t.true(client.enqueue.calledOnce);
  t.deepEqual(client.enqueue.firstCall.args, ['screen', message, noop]);
});

test('screen - require either userId or anonymousId', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  t.throws(() => client.screen(), 'You must pass a message object.');
  t.throws(() => client.screen({}), 'You must pass either an "anonymousId" or a "userId".');
  t.notThrows(() => client.screen({ userId: 'id' }));
  t.notThrows(() => client.screen({ anonymousId: 'id' }));
});

test('alias - enqueue a message', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  const message = {
    userId: 'id',
    previousId: 'id',
  };

  client.alias(message, noop);

  t.true(client.enqueue.calledOnce);
  t.deepEqual(client.enqueue.firstCall.args, ['alias', message, noop]);
});

test('alias - require previousId and userId', (t) => {
  const client = createClient();
  stub(client, 'enqueue');

  t.throws(() => client.alias(), 'You must pass a message object.');
  t.throws(() => client.alias({}), 'You must pass a "userId".');
  t.throws(() => client.alias({ userId: 'id' }), 'You must pass a "previousId".');
  t.notThrows(() => {
    client.alias({
      userId: 'id',
      previousId: 'id',
    });
  });
});

test('isErrorRetryable', (t) => {
  const client = createClient();

  // test error cases
  t.true(client.isErrorRetryable(0, {}, {}));
  t.true(client.isErrorRetryable(0, { code: 'ETIMEDOUT' }, {}));
  t.true(client.isErrorRetryable(0, { code: 'ECONNABORTED' }, {}));

  // test network request cases
  t.true(client.isErrorRetryable(0, null, { status: 500 }));
  t.true(client.isErrorRetryable(0, null, { status: 429 }));
  // do not retry after 3 attempts
  t.false(client.isErrorRetryable(3, null, { status: 429 }));
  // do not retry on success
  t.false(client.isErrorRetryable(0, null, { status: 200 }));
});
